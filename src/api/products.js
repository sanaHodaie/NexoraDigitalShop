import { api } from './client';
import { createProductResource } from './product-resource';

let storage;
try { storage = window.sessionStorage; } catch { /* Private browsing may deny storage. */ }
export const productsResource = createProductResource({ fetchProducts: () => api('/products'), storage });
