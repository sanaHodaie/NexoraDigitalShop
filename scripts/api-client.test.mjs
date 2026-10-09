import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { api, resetCsrf } from '../src/api/client.js';
import backendUnavailable from '../api/backend-unavailable.js';

const originalFetch = globalThis.fetch;
const registration = {
  method: 'POST',
  body: JSON.stringify({ email: 'test@example.com', password: 'test-password-123' }),
};
const json = (data, status = 200) => Response.json(data, { status });

beforeEach(() => resetCsrf());
afterEach(() => {
  globalThis.fetch = originalFetch;
  resetCsrf();
});

function mockFetch(...responses) {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    assert.ok(responses.length, `Unexpected extra request to ${url}`);
    const response = responses.shift();
    if (response instanceof Error) throw response;
    return response;
  };
  return calls;
}

function isReadablePersianError(error) {
  assert.ok(error instanceof Error);
  assert.match(error.message, /[\u0600-\u06ff]/);
  assert.doesNotMatch(error.message, /Failed to fetch|Unexpected token|Unexpected end|JSON at position/);
  return true;
}

test('a CSRF network failure is readable and never submits registration', async () => {
  const calls = mockFetch(new TypeError('Failed to fetch'));

  await assert.rejects(api('/auth/register', registration), isReadablePersianError);

  assert.deepEqual(calls.map(call => call.url), ['/api/csrf']);
});

test('a registration network failure is readable and does not retry the POST', async () => {
  const calls = mockFetch(json({ token: 'csrf-one' }), new TypeError('Failed to fetch'));

  await assert.rejects(api('/auth/register', registration), isReadablePersianError);

  assert.deepEqual(calls.map(call => call.url), ['/api/csrf', '/api/auth/register']);
  assert.equal(calls[1].options.method, 'POST');
});

test('an unconfigured Vercel backend reports its actual 503 error at CSRF and never posts', async () => {
  const response = backendUnavailable.fetch();
  const { error: message } = await response.clone().json();
  const calls = mockFetch(response);

  await assert.rejects(api('/auth/register', registration), {
    message, status: 503, code: 'BACKEND_NOT_CONFIGURED',
  });
  assert.deepEqual(calls.map(call => call.url), ['/api/csrf']);
});

test('a CSRF HTTP error preserves the server explanation', async () => {
  const message = 'سرویس موقتاً در دسترس نیست.';
  const calls = mockFetch(json({ error: message }, 502));
  await assert.rejects(api('/auth/register', registration), { message, status: 502 });
  assert.equal(calls.length, 1);
});

test('an HTML gateway failure remains a service error, not a TLS error', async () => {
  const calls = mockFetch(new Response('<h1>Bad gateway</h1>', { status: 502 }));
  await assert.rejects(api('/auth/register', registration), error => {
    assert.equal(error.status, 502);
    assert.doesNotMatch(error.message, /ارتباط امن/);
    return isReadablePersianError(error);
  });
  assert.equal(calls.length, 1);
});

test('a null JSON error body still preserves the authentication error', async () => {
  mockFetch(json({ token: 'csrf-one' }), json(null, 401));
  await assert.rejects(api('/auth/login', registration), {
    message: 'ایمیل یا رمز عبور نادرست است.', status: 401,
  });
});

for (const [description, body] of [
  ['missing', {}],
  ['empty', { token: '' }],
  ['whitespace only', { token: '   ' }],
  ['null', { token: null }],
  ['numeric', { token: 123 }],
  ['a null response', null],
]) {
  test(`a ${description} CSRF token prevents registration`, async () => {
    const calls = mockFetch(json(body));

    await assert.rejects(api('/auth/register', registration), isReadablePersianError);

    assert.deepEqual(calls.map(call => call.url), ['/api/csrf']);
  });
}

for (const [description, body, contentType] of [
  ['HTML', '<!doctype html><title>Nexora</title>', 'text/html'],
  ['malformed JSON', '{"token":', 'application/json'],
]) {
  test(`${description} in the CSRF response is readable and prevents registration`, async () => {
    const calls = mockFetch(new Response(body, { headers: { 'Content-Type': contentType } }));

    await assert.rejects(api('/auth/register', registration), isReadablePersianError);

    assert.deepEqual(calls.map(call => call.url), ['/api/csrf']);
  });

  test(`${description} in an API response becomes a readable service error`, async () => {
    mockFetch(new Response(body, { headers: { 'Content-Type': contentType } }));

    await assert.rejects(api('/products'), isReadablePersianError);
  });
}

test('registration sends cookies and the CSRF token and returns the server response', async () => {
  const account = { email: 'test@example.com' };
  const calls = mockFetch(json({ token: 'csrf-one' }), json(account));

  assert.deepEqual(await api('/auth/register', registration), account);

  assert.equal(calls[0].options.credentials, 'same-origin');
  assert.equal(calls[1].options.credentials, 'same-origin');
  assert.equal(calls[1].options.headers['X-CSRF-TOKEN'], 'csrf-one');
  assert.equal(calls[1].options.headers['Content-Type'], 'application/json');
  assert.equal(calls[1].options.body, registration.body);
});

test('resetCsrf obtains a fresh token after authentication changes', async () => {
  const calls = mockFetch(
    json({ token: 'anonymous-token' }), json({ email: 'test@example.com' }),
    json({ token: 'account-token' }), new Response(null, { status: 204 }),
  );

  await api('/auth/register', registration);
  resetCsrf();
  assert.equal(await api('/auth/logout', { method: 'POST' }), null);

  assert.deepEqual(calls.map(call => call.url), [
    '/api/csrf', '/api/auth/register', '/api/csrf', '/api/auth/logout',
  ]);
  assert.equal(calls[1].options.headers['X-CSRF-TOKEN'], 'anonymous-token');
  assert.equal(calls[3].options.headers['X-CSRF-TOKEN'], 'account-token');
});

test('explicit server errors are preserved', async () => {
  const message = 'این ایمیل قبلاً ثبت شده است.';
  mockFetch(json({ token: 'csrf-one' }), json({ error: message }, 409));

  await assert.rejects(api('/auth/register', registration), { message });
});

test('a login 401 retains the incorrect credentials message', async () => {
  mockFetch(json({ token: 'csrf-one' }), new Response(null, { status: 401 }));

  await assert.rejects(api('/auth/login', registration), {
    message: 'ایمیل یا رمز عبور نادرست است.',
  });
});

test('GET returns JSON without requesting a CSRF token', async () => {
  const products = [{ id: 'one', name: 'Headphones' }];
  const calls = mockFetch(json(products));

  assert.deepEqual(await api('/products'), products);

  assert.deepEqual(calls.map(call => call.url), ['/api/products']);
  assert.equal(calls[0].options.credentials, 'same-origin');
  assert.equal(calls[0].options.headers['X-CSRF-TOKEN'], undefined);
});

for (const status of [204, 202]) {
  test(`a ${status} response returns null without parsing JSON`, async () => {
    mockFetch(json({ token: 'csrf-one' }), new Response(null, { status }));

    assert.equal(await api('/newsletter', {
      method: 'POST', body: JSON.stringify({ email: 'test@example.com' }),
    }), null);
  });
}

test('registration and recovery preserve the generic message in JSON 202 responses', async () => {
  const message = 'اگر حساب واجد شرایطی وجود داشته باشد، ایمیل راهنما ارسال می‌شود.';
  for (const path of ['/auth/register', '/auth/forgot-password', '/auth/request-verification']) {
    resetCsrf();
    mockFetch(json({ token: 'csrf-one' }), json({ message }, 202));
    assert.deepEqual(await api(path, registration), { message });
  }
});
