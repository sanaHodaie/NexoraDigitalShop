import { api } from './client';
import { createProductResource } from './product-resource';

let storage;
try { storage = window.localStorage; } catch { /* Private browsing may deny storage. */ }
export const productsResource = createProductResource({ fetchProducts: async () => {
  const controller = new AbortController();
  // Allow a free host to wake up, but always leave a retryable state on timeout.
  const timeout = setTimeout(() => controller.abort(), 70_000);
  try { return await api('/products', { credentials: 'omit', signal: controller.signal }); }
  finally { clearTimeout(timeout); }
}, storage });
