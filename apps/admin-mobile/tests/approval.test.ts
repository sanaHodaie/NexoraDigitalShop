import assert from 'node:assert/strict';
import test from 'node:test';
import { approvalSchema, totalRial } from '../src/lib/approval';

test('Persian and Arabic digits become exact, validated invoice integers', () => {
  const result = approvalSchema.parse({ lines: [{ name: ' گوشی ', quantity: '۲۰', unitPriceRial: '١٢٠٠٠٠' }], shippingRial: '۰', terms: '' });
  assert.equal(result.lines[0].name, 'گوشی');
  assert.equal(totalRial(result), 2400000n);
});

test('invoice totals remain exact beyond Number.MAX_SAFE_INTEGER', () => {
  const result = approvalSchema.parse({ lines: [{ name: 'Wholesale', quantity: '1000000', unitPriceRial: '1000000000000' }], shippingRial: '1', terms: '' });
  assert.equal(totalRial(result), 1000000000000000001n);
});

test('invalid, negative, fractional or out-of-range amounts cannot reach approval', () => {
  for (const price of ['', '0', '-1', '1.5', '1e5', '1000000000001']) {
    assert.equal(approvalSchema.safeParse({ lines: [{ name: 'Phone', quantity: '1', unitPriceRial: price }], shippingRial: '0', terms: '' }).success, false);
  }
});
