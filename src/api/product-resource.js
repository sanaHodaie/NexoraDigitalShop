// Cache public catalogue data only; account/session data never enters storage.
const KEY = 'nexora:catalog:v1';
const FRESH_MS = 60_000;
const MAX_AGE_MS = 300_000;
const valid = products => Array.isArray(products) && products.every(p =>
  p && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.nameEn === 'string'
  && typeof p.image === 'string' && typeof p.price === 'number' && Number.isFinite(p.price));

export function createProductResource({ fetchProducts, storage, now = Date.now }) {
  let updatedAt = 0, pending;
  let state = { products: [], status: 'loading', refreshing: false, refreshError: false };
  const listeners = new Set();
  try {
    const saved = JSON.parse(storage?.getItem(KEY) || 'null');
    if (saved && valid(saved.products) && now() >= saved.updatedAt && now() - saved.updatedAt < MAX_AGE_MS) {
      updatedAt = saved.updatedAt;
      state = { ...state, products: saved.products, status: 'ready' };
    }
  } catch { /* Storage can be unavailable or contain an obsolete entry. */ }
  const emit = next => { state = { ...state, ...next }; listeners.forEach(notify => notify()); };
  const load = ({ force = false } = {}) => {
    if (pending) return pending;
    if (!force && state.status === 'ready' && now() - updatedAt < FRESH_MS) return Promise.resolve();
    emit({ status: state.products.length ? 'ready' : 'loading', refreshing: true, refreshError: false });
    pending = Promise.resolve().then(fetchProducts).then(products => {
      if (!valid(products)) throw new Error('Invalid catalogue response');
      updatedAt = now();
      try { storage?.setItem(KEY, JSON.stringify({ products, updatedAt })); } catch { /* Optional cache. */ }
      emit({ products, status: 'ready', refreshError: false });
    }).catch(() => {
      emit({ status: state.products.length ? 'ready' : 'error', refreshError: true });
    }).finally(() => { pending = undefined; emit({ refreshing: false }); });
    return pending;
  };
  return { load, getSnapshot: () => state, subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); } };
}
