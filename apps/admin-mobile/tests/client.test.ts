import assert from 'node:assert/strict';
import test from 'node:test';
import { AdminApi, ApiError, normalizeApiUrl } from '../src/api/client';

test('native API origins reject credential URLs and public cleartext HTTP', () => {
  assert.equal(normalizeApiUrl('http://10.0.2.2:8000/', true), 'http://10.0.2.2:8000');
  assert.equal(normalizeApiUrl('https://api.example.test/'), 'https://api.example.test');
  for (const value of ['http://api.example.test', 'https://user:secret@api.test', 'https://api.test/api', 'https://api.test?token=x']) {
    assert.throws(() => normalizeApiUrl(value, true));
  }
  assert.throws(() => normalizeApiUrl('http://192.168.1.10:8000', false));
});

test('native requests use bearer headers, no browser cookies and no URL tokens', async () => {
  let url = '', options: RequestInit | undefined;
  const fetcher = (async (input, init) => {
    url = String(input); options = init;
    return new Response(JSON.stringify({ total: 1 }), { status: 200 });
  }) as typeof fetch;
  const api = new AdminApi('https://api.test', 'test-session', undefined, fetcher);
  const data = await api.request<{ total: number }>('/api/admin/customer-requests');
  assert.equal(data.total, 1);
  assert.equal(url, 'https://api.test/api/admin/customer-requests');
  assert.equal(options?.credentials, 'omit');
  assert.equal((options?.headers as Record<string, string>).Authorization, 'Bearer test-session');
  await assert.rejects(api.request('/api/account/profile'));
});

test('browser fetch is called without an API-instance receiver', async () => {
  const fetcher = (async function (this: unknown) {
    assert.equal(this, undefined);
    return new Response('{"status":"ok"}');
  }) as typeof fetch;
  const api = new AdminApi('https://api.test', null, undefined, fetcher);
  assert.deepEqual(await api.request('/health'), { status: 'ok' });
});

test('expired sessions trigger local invalidation; failed login does not', async () => {
  let expired = 0;
  const fetcher = (async () => new Response(JSON.stringify({ code: 'UNAUTHENTICATED' }), { status: 401 })) as typeof fetch;
  const api = new AdminApi('https://api.test', 'session', () => expired++, fetcher);
  await assert.rejects(api.request('/api/admin/me'), (e: unknown) => e instanceof ApiError && e.status === 401);
  assert.equal(expired, 1);
  await assert.rejects(new AdminApi('https://api.test', null, () => expired++, fetcher).request('/api/mobile/session', { method: 'POST' }));
  assert.equal(expired, 1);
});

test('writes are serialized once; conflicts stay errors and never claim success', async () => {
  let calls = 0;
  const fetcher = (async (_input, options) => {
    calls++; assert.equal(options?.body, '{"version":1}');
    return new Response(JSON.stringify({ code: 'CONFLICT' }), { status: 409 });
  }) as typeof fetch;
  const api = new AdminApi('https://api.test', 'session', undefined, fetcher);
  await assert.rejects(api.request('/api/admin/customer-requests/1/approve', { method: 'POST', body: { version: 1 } }),
    (e: unknown) => e instanceof ApiError && e.status === 409);
  assert.equal(calls, 1);
});

test('spreadsheet uploads preserve exact binary bytes and content type', async () => {
  const bytes = new Uint8Array([80, 75, 3, 4, 0, 255]).buffer;
  const fetcher = (async (_input, init) => {
    assert.equal(init?.method, 'POST');
    assert.equal(init?.body, bytes);
    assert.equal((init?.headers as Record<string, string>)['Content-Type'], 'application/test-xlsx');
    return new Response('{"canImport":true}');
  }) as typeof fetch;
  const api = new AdminApi('https://api.test', 'session', undefined, fetcher);
  assert.deepEqual(await api.request('/api/admin/products/import?commit=false', {
    method: 'POST', raw: bytes, contentType: 'application/test-xlsx',
  }), { canImport: true });
});

test('cancelled private queries propagate abort instead of becoming network errors', async () => {
  const controller = new AbortController(); controller.abort();
  const fetcher = (async (_input, init) => {
    assert.ok(init?.signal?.aborted);
    throw new DOMException('Cancelled', 'AbortError');
  }) as typeof fetch;
  await assert.rejects(new AdminApi('https://api.test', 'session', undefined, fetcher)
    .request('/api/admin/products', { signal: controller.signal }), (error: unknown) => error instanceof DOMException && error.name === 'AbortError');
});
