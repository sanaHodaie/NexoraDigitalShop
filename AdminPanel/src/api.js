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
