let csrfToken;
export const resetCsrf = () => { csrfToken = undefined; };

export async function api(path, options = {}) {
  if (options.method && options.method !== 'GET' && !csrfToken) {
    const response = await fetch('/api/csrf', { credentials: 'same-origin' });
    if (!response.ok) throw new Error('ارتباط امن با سرور برقرار نشد.');
    csrfToken = (await response.json()).token;
  }
  const response = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.method && options.method !== 'GET' ? { 'X-CSRF-TOKEN': csrfToken } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || (response.status === 401 ? 'ابتدا وارد حساب خود شوید.' : 'درخواست انجام نشد. دوباره تلاش کنید.'));
  }
  return response.status === 204 || response.status === 202 ? null : response.json();
}
