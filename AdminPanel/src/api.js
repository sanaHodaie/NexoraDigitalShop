import {api as request, resetCsrf} from '../../src/api/client';
export {resetCsrf};
export async function api(path, options = {}) {
  try { return await request(path, options); }
  catch (error) {
    if (error.status === 401 && path.startsWith('/admin/')) window.dispatchEvent(new Event('nexora:admin-expired'));
    throw error;
  }
}
export const write = (path, method, body) => api(path, {method, ...(body === undefined ? {} : {body: JSON.stringify(body)})});

// Authenticated binary GETs share the browser session. Never put credentials in URLs.
export async function download(path, filename, mime) {
  const response = await fetch('/api' + path, {credentials:'same-origin', cache:'no-store'});
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event('nexora:admin-expired'));
    const body = await response.json().catch(()=>null);
    throw new Error(body?.error || 'دریافت فایل انجام نشد؛ دوباره تلاش کنید.');
  }
  if (!response.headers.get('content-type')?.includes(mime)) throw new Error('سرور فایل معتبر برنگرداند.');
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a'); link.href=url; link.download=filename; document.body.append(link); link.click(); link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}
