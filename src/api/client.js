let csrfToken;
export const resetCsrf = () => { csrfToken = undefined; };

const serviceUnavailable = 'سرویس سایت در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید.';

async function request(url, options) {
  try {
    return await fetch(url, options);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.', { cause: error });
    }
    throw error;
  }
}

async function readJson(response) {
  // A static host may return the SPA's HTML fallback for a missing /api route.
  // Do not treat it as a successful API response or submit without a CSRF token.
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error(serviceUnavailable);
  }
  try { return await response.json(); }
  catch { throw new Error(serviceUnavailable); }
}

async function responseError(response, fallback) {
  const data = await response.json().catch(() => null);
  const message = typeof data?.error === 'string' && data.error.trim()
    ? data.error
    : response.status >= 500 ? serviceUnavailable : fallback;
  const error = new Error(message);
  error.status = response.status;
  if (typeof data?.code === 'string') error.code = data.code;
  return error;
}

export async function api(path, options = {}) {
  if (options.method && options.method !== 'GET' && !csrfToken) {
    const response = await request('/api/csrf', { credentials: 'same-origin' });
    if (!response.ok) throw await responseError(response,
      'سرویس ورود و ثبت‌نام در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید.');
    const data = await readJson(response);
    if (typeof data?.token !== 'string' || !data.token.trim()) throw new Error(serviceUnavailable);
    csrfToken = data.token;
  }
  const response = await request(`/api${path}`, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.method && options.method !== 'GET' ? { 'X-CSRF-TOKEN': csrfToken } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    if (response.status === 401 && path.startsWith('/account/') && typeof window !== 'undefined') {
      resetCsrf();
      window.dispatchEvent(new Event('nexora:session-expired'));
    }
    throw await responseError(response, response.status === 401
      ? (path === '/auth/login' ? 'ایمیل یا رمز عبور نادرست است.' : 'ابتدا وارد حساب خود شوید.')
      : 'درخواست انجام نشد. دوباره تلاش کنید.');
  }
  if (response.status === 204) return null;
  // Newsletter returns an empty 202; registration/recovery return a JSON message.
  if (response.status === 202 && !response.headers.get('content-type')) return null;
  return readJson(response);
}
