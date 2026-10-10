import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, access } from 'node:fs/promises';
import { CATALOG_CATEGORIES, categoryHref, selectCatalogProducts } from '../src/data/catalog.js';

const products = JSON.parse(await readFile(new URL('../backend/data/catalog-products.json', import.meta.url), 'utf8'));
const existing = JSON.parse(await readFile(new URL('../backend/data/products.json', import.meta.url), 'utf8'));

test('each category has ten distinct purchasable seed products with local artwork', async () => {
  assert.equal(new Set([...products, ...existing].map(p => p.id)).size, products.length + existing.length);
  for (const id of Object.keys(CATALOG_CATEGORIES)) {
    const selected = selectCatalogProducts([...existing, ...products], id);
    assert.equal(selected.length, 10);
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
});
