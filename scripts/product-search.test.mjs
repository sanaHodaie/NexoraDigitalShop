import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSearchIndex, normalizeSearch, suggestProducts } from '../src/lib/product-search.js';
import { selectCatalogProducts } from '../src/data/catalog.js';

const products = [
  { id: 'phone-01', name: 'اپل آیفون ۱۵ پرو مکس', nameEn: 'Apple iPhone 15 Pro Max', category: 'smartphones', brand: 'Apple', price: 100, inStock: true },
  { id: 'computer-01', name: 'لپ‌تاپ لنوو', nameEn: 'Lenovo ThinkPad', category: 'laptops', specs: ['رم ۱۶ گیگابایت'], price: 200, inStock: true },
  { id: 'phone-02', name: 'سامسونگ گلکسی S24', nameEn: 'Samsung Galaxy S24', category: 'smartphones', price: 150, inStock: false },
  { id: 'archived', name: 'iPhone 15', isActive: false },
];
const index = buildSearchIndex(products);

test('Persian/Arabic letters, digits and half spaces share search semantics', () => {
  assert.equal(normalizeSearch('آيفون ١٥ كالا'), 'ایفون 15 کالا');
  for (const query of ['آيفون ١٥', 'iPhone ۱۵', '15 apple pro']) {
    assert.equal(suggestProducts(index, query)[0].id, 'phone-01');
  }
  assert.equal(suggestProducts(index, 'لپتاپ ۱۶')[0].id, 'computer-01');
  assert.equal(suggestProducts(index, 'لپ تاپ')[0].id, 'computer-01');
});

test('empty, invalid and unmatched requests never select an unrelated product', () => {
  for (const query of ['', '  ', '؟؟؟', 'nonexistent', 'iphone samsung']) assert.deepEqual(suggestProducts(index, query), []);
  assert.deepEqual(buildSearchIndex([{ id: 'a', specs: null }])[0].names, ['', '', 'a']);
  assert.equal(index.some(entry => entry.product.id === 'archived'), false);
});

test('rank exact names above incidental matches and respect suggestion limit', () => {
  const entries = buildSearchIndex([{ id: 'a', name: 'Case for Pixel' }, { id: 'b', name: 'Pixel' }, { id: 'c', name: 'Pixel Pro' }]);
  assert.deepEqual(suggestProducts(entries, 'pixel', 2).map(p => p.id), ['b', 'c']);
  const phones = buildSearchIndex([{ id: 'old', name: 'iPhone 14', specs: ['A15', '128GB'] }, { id: 'new', name: 'iPhone 15' }]);
  assert.deepEqual(suggestProducts(phones, 'iphone 15').map(p => p.id), ['new']);
});

test('category filtering and suggestions agree without crossing category or stock filters', () => {
  assert.equal(selectCatalogProducts(products, 'smartphones', { query: '15 apple' })[0].id, 'phone-01');
  assert.equal(selectCatalogProducts(products, 'laptops', { query: 'لپتاپ ١٦' })[0].id, 'computer-01');
  const available = selectCatalogProducts(products, 'smartphones', { available: true });
  assert.deepEqual(suggestProducts(buildSearchIndex(available), 'samsung'), []);
  assert.equal(suggestProducts(index, 'samsung')[0].inStock, false);
});
