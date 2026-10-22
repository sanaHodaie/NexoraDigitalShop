import test from 'node:test';
import assert from 'node:assert/strict';
import { addComparison, comparisonIds, comparisonRows, productSpecGroups } from '../src/lib/comparison.js';

const items = [
  { id: 'a', category: 'laptops', brand: 'Apple', specs: ['رم ۱۶ گیگابایت', 'SSD ۲۵۶ گیگابایت', 'تراشه Apple M3'] },
  { id: 'b', category: 'laptops', brand: 'Apple', specs: ['رم ۸ گیگابایت', 'SSD ۵۱۲ گیگابایت', 'تراشه Apple M3'] },
  { id: 'c', category: 'laptops' }, { id: 'd', category: 'laptops' }, { id: 'phone', category: 'smartphones' },
];
test('selection is bounded, unique and same-category without mutating inputs', () => {
  let ids = [];
  for (const item of items.slice(0, 3)) ids = addComparison(ids, item, items).ids;
  assert.deepEqual(ids, ['a', 'b', 'c']);
  assert.deepEqual(addComparison(ids, items[0], items), { ids, error: '' });
  assert.ok(addComparison(ids, items[3], items).error);
  assert.deepEqual(ids, ['a', 'b', 'c']);
  assert.ok(addComparison(['a'], items[4], items).error);
  assert.deepEqual(addComparison([], items[4], items).ids, ['phone']);
});
test('persisted IDs reject malformed values and cap at three', () => {
  for (const value of [null, {}, 'broken', 1]) assert.deepEqual(comparisonIds(value), []);
  assert.deepEqual(comparisonIds(['a', 'a', '<script>', 2, 'b', 'c', 'd']), ['a', 'b', 'c']);
});
test('comparison aligns RAM, storage and processor rather than spec positions', () => {
  const rows = comparisonRows([items[0], { ...items[1], specs: [...items[1].specs].reverse() }]);
  assert.deepEqual(rows.find(row => row.key === 'ram').values, ['رم ۱۶ گیگابایت', 'رم ۸ گیگابایت']);
  assert.equal(rows.find(row => row.key === 'ram').different, true);
  assert.equal(rows.find(row => row.key === 'cpu').different, false);
  assert.equal(rows.find(row => row.key === 'brand').different, false);
});
test('unknown/missing specs remain explicit and no product facts are invented', () => {
  const a = { specs: ['گیمبال سه‌محوره', 'کیف مخصوص', 'رم ۱۶ گیگابایت'] }, b = { specs: null };
  const rows = comparisonRows([a, b]);
  assert.deepEqual(rows.find(row => row.key === 'other').values, ['گیمبال سه‌محوره · کیف مخصوص', '']);
  assert.deepEqual(rows.find(row => row.key === 'ram').values, ['رم ۱۶ گیگابایت', '']);
  assert.equal(rows.some(row => row.key === 'cpu'), false);
  assert.deepEqual(productSpecGroups(b), {});
});
