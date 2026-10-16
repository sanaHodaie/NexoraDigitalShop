import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, access } from 'node:fs/promises';
import { CATALOG_CATEGORIES, categoryHref, selectCatalogProducts } from '../src/data/catalog.js';

const products = JSON.parse(await readFile(new URL('../backend/data/catalog-products.json', import.meta.url), 'utf8'));
const existing = JSON.parse(await readFile(new URL('../backend/data/products.json', import.meta.url), 'utf8'));

test('each category has its configured purchasable seed products with local artwork', async () => {
  assert.equal(new Set([...products, ...existing].map(p => p.id)).size, products.length + existing.length);
  for (const id of Object.keys(CATALOG_CATEGORIES)) {
    const selected = selectCatalogProducts([...existing, ...products], id);
    assert.equal(selected.length, CATALOG_CATEGORIES[id].productIds.length);
    assert.ok(selected.every(p => p.category === id && p.price > 0 && p.specs.length === 3));
    for (const product of selected) await access(new URL(`../public${product.image}`, import.meta.url));
    for (const asset of [CATALOG_CATEGORIES[id].image, CATALOG_CATEGORIES[id].fallbackImage]) {
      await access(new URL(`../public${asset}`, import.meta.url));
    }
    assert.equal(categoryHref(id), `/category/${id}`);
  }
});
test('search, brand, availability and sorting compose without changing source prices', () => {
  const snapshots = JSON.stringify(products);
  const found = selectCatalogProducts(products, 'smartphones', { query: 'ايفون 15', brand: 'Apple', sort: 'price-asc' });
  assert.deepEqual(found.map(p => p.id), ['phone-01', 'phone-02']);
  assert.equal(selectCatalogProducts(products, 'smartphones', { query: 'iPhone', brand: 'Samsung' }).length, 0);
  const unavailable = products.map(p => ({ ...p, inStock: false }));
  assert.equal(selectCatalogProducts(unavailable, 'laptops', { available: true }).length, 0);
  const sorted = selectCatalogProducts(products, 'laptops', { sort: 'price-desc' });
  assert.ok(sorted.every((p, i) => !i || sorted[i - 1].price >= p.price));
  assert.equal(JSON.stringify(products), snapshots);
  assert.deepEqual(selectCatalogProducts(products, 'unknown'), []);
  assert.deepEqual(selectCatalogProducts(products, 'smart-home', { query: 'P110' }).map(p => p.id), ['home-05']);
  const home = selectCatalogProducts(products, 'smart-home', { sort: 'price-asc', brand: 'TP-Link' });
  assert.equal(home.length, 10);
  assert.ok(home.every((p, i) => !i || home[i - 1].price <= p.price));
  assert.deepEqual(selectCatalogProducts(products, 'wearables', { query: 'بند ۹', brand: 'Xiaomi' }).map(p => p.id), ['watch-07']);
  assert.equal(selectCatalogProducts(products, 'wearables', { brand: 'Samsung' }).length, 3);
  const watches = selectCatalogProducts(products, 'wearables', { sort: 'price-asc' });
  assert.equal(watches[0].id, 'watch-07');
  assert.equal(watches.at(-1).id, 'watch-03');
  assert.deepEqual(selectCatalogProducts(products, 'accessories', { query: 'Revodok', brand: 'UGREEN' }).map(p => p.id), ['accessory-10']);
  assert.equal(selectCatalogProducts(products, 'accessories', { brand: 'Logitech' }).length, 4);
  const accessories = selectCatalogProducts(products, 'accessories', { sort: 'price-desc' });
  assert.equal(accessories[0].id, 'accessory-06');
  assert.equal(selectCatalogProducts(unavailable, 'accessories', { available: true }).length, 0);
  assert.deepEqual(selectCatalogProducts(products, 'cameras', { query: 'Sigma', brand: 'Sigma' }).map(p => p.id), ['camera-09']);
  assert.equal(selectCatalogProducts(products, 'cameras', { brand: 'Canon' }).length, 3);
  assert.equal(selectCatalogProducts(products, 'cameras', { sort: 'price-asc' })[0].id, 'camera-07');
  assert.equal(selectCatalogProducts(unavailable, 'cameras', { available: true }).length, 0);
  assert.deepEqual(selectCatalogProducts(products, 'drones', { query: 'Air 3S', brand: 'DJI' }).map(p => p.id), ['drone-05']);
  assert.equal(selectCatalogProducts(products, 'drones', { brand: 'Autel' }).length, 1);
  assert.equal(selectCatalogProducts(products, 'drones', { sort: 'price-asc' })[0].id, 'drone-06');
  assert.equal(selectCatalogProducts(unavailable, 'drones', { available: true }).length, 0);
});
