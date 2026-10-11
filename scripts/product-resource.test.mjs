import assert from 'node:assert/strict';
import test from 'node:test';
import { createProductResource } from '../src/api/product-resource.js';

const products = [{ id: 'phone-01', name: 'Phone', nameEn: 'Phone', image: '/phone.webp', price: 123 }];
const storage = () => {
  const values = new Map();
  return { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
};

test('parallel mounts and category changes reuse one catalogue request', async () => {
  let calls = 0, resolve;
  const cache = createProductResource({ fetchProducts: () => { calls++; return new Promise(r => { resolve = r; }); } });
  const first = cache.load(), second = cache.load();
  assert.equal(first, second);
  await Promise.resolve();
  resolve(products);
  await first;
  await cache.load();
  assert.equal(calls, 1);
  assert.deepEqual(cache.getSnapshot().products, products);
});

test('expired memory refresh keeps cards visible and updates price from API', async () => {
  let time = 100_000, calls = 0;
  const cache = createProductResource({ now: () => time, fetchProducts: async () => {
    calls++; return products.map(p => ({ ...p, price: calls * 100 }));
  } });
  await cache.load();
  time += 61_000;
  const refresh = cache.load();
  assert.equal(cache.getSnapshot().status, 'ready');
  assert.equal(cache.getSnapshot().products[0].price, 100);
  await refresh;
  assert.equal(cache.getSnapshot().products[0].price, 200);
});

test('recent public catalogue survives reload; cache older than five minutes is ignored', async () => {
  const saved = storage(); let time = 100_000;
  const options = { storage: saved, now: () => time, fetchProducts: async () => products };
  await createProductResource(options).load();
  assert.deepEqual(createProductResource(options).getSnapshot().products, products);
  time += 300_001;
  assert.equal(createProductResource(options).getSnapshot().status, 'loading');
});

test('network failure retains existing cards with an explicit stale-data flag and supports retry', async () => {
  let fail = false;
  const cache = createProductResource({ fetchProducts: async () => {
    if (fail) throw new Error('offline'); return products;
  } });
  await cache.load(); fail = true;
  await cache.load({ force: true });
  assert.equal(cache.getSnapshot().status, 'ready');
  assert.equal(cache.getSnapshot().refreshError, true);
  assert.deepEqual(cache.getSnapshot().products, products);
  fail = false; await cache.load({ force: true });
  assert.equal(cache.getSnapshot().refreshError, false);
});

test('invalid server data produces a retryable error instead of cached fake products', async () => {
  const cache = createProductResource({ fetchProducts: async () => '<html>Error</html>' });
  await cache.load();
  assert.equal(cache.getSnapshot().status, 'error');
  assert.deepEqual(cache.getSnapshot().products, []);
});

test('unavailable browser storage does not block loading', async () => {
  const cache = createProductResource({ fetchProducts: async () => products, storage: {
    getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); },
  } });
  await cache.load();
  assert.equal(cache.getSnapshot().status, 'ready');
});

test('an empty successful catalogue replaces previously cached products', async () => {
  let empty = false;
  const cache = createProductResource({ fetchProducts: async () => empty ? [] : products });
  await cache.load(); empty = true; await cache.load({ force: true });
  assert.equal(cache.getSnapshot().status, 'ready');
  assert.deepEqual(cache.getSnapshot().products, []);
});
