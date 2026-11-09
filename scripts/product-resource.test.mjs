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

test('public catalogue survives returning visits; cache older than a day is ignored', async () => {
  const saved = storage(); let time = 100_000;
  const options = { storage: saved, now: () => time, fetchProducts: async () => products };
  await createProductResource(options).load();
  assert.deepEqual(createProductResource(options).getSnapshot().products, products);
  time += 86_400_001;
  assert.equal(createProductResource(options).getSnapshot().status, 'loading');
});

test('returning visitors see cached cards immediately while a cold API is pending', async () => {
  const saved = storage(); let time = 100_000;
  await createProductResource({ storage: saved, now: () => time, fetchProducts: async () => products }).load();
  time += 3_600_000;
  let resolve;
  const cache = createProductResource({ storage: saved, now: () => time,
    fetchProducts: () => new Promise(r => { resolve = r; }) });
  assert.equal(cache.getSnapshot().status, 'ready');
  assert.equal(cache.getSnapshot().stale, true);
  const pending = cache.load(); await Promise.resolve();
  assert.deepEqual(cache.getSnapshot().products, products);
  assert.equal(cache.getSnapshot().refreshing, true);
  resolve(products.map(p => ({ ...p, price: 456 })));
  await pending;
  assert.equal(cache.getSnapshot().products[0].price, 456);
  assert.equal(cache.getSnapshot().stale, false);
});

test('invalid and future cache timestamps do not display old products', () => {
  for (const updatedAt of ['100', null, 200_000]) {
    const cache = createProductResource({ now: () => 100_000, fetchProducts: async () => products,
      storage: { getItem: () => JSON.stringify({ products, updatedAt }) } });
    assert.equal(cache.getSnapshot().status, 'loading');
  }
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

test('old API and returning visitor caches resolve exact deal placeholders without changing merchant photos', async () => {
  const defaults = [
    ['flash-1', 'collection_smart_home_1790528023441', 'flash-1'],
    ['flash-2', 'collection_gaming_gear_1790528013982', 'accessory-01'],
    ['flash-3', 'collection_laptop_pc_1790528088687', 'flash-3'],
    ['flash-4', 'collection_audio_headphones_1790528002919', 'flash-4'],
  ];
  for (const extension of ['jpg', 'webp']) {
    const legacy = defaults.map(([id, source]) => ({...products[0], id, image: `/assets/${source}.${extension}`}));
    const expected = defaults.map(([, , photo]) => `/assets/products/${photo}.webp`);
    const saved = storage();
    saved.setItem('nexora:catalog:v1', JSON.stringify({products: legacy, updatedAt: 100_000}));
    const cache = createProductResource({storage: saved, now: () => 100_000, fetchProducts: async () => legacy});
    assert.deepEqual(cache.getSnapshot().products.map(p => p.image), expected);
    await cache.load({force: true});
    assert.deepEqual(cache.getSnapshot().products.map(p => p.image), expected);
    assert.deepEqual(cache.getSnapshot().products.map(p => p.price), legacy.map(p => p.price));
    assert.deepEqual(JSON.parse(saved.getItem('nexora:catalog:v1')).products.map(p => p.image), expected);
  }
  const custom = [{...products[0], id: 'flash-1', image: '/uploads/my-anker.webp'}];
  const resource = createProductResource({fetchProducts: async () => custom});
  await resource.load();
  assert.deepEqual(resource.getSnapshot().products, custom);
});
