const test = require('node:test');
const assert = require('node:assert/strict');
const { validateProduct } = require('../validation');

const VALID_PRODUCT = { name: 'Notebook', sku: 'NB-100', price: 49.5, stock: 20, category: 'Stationery' };

test('accepts a complete, valid product', () => {
  assert.deepEqual(validateProduct(VALID_PRODUCT, false), []);
});

test('reports every missing field', () => {
  assert.equal(validateProduct({}, false).length, 5);
});

test('rejects a badly formatted sku', () => {
  const errors = validateProduct({ ...VALID_PRODUCT, sku: 'a b' }, false);
  assert.deepEqual(errors, ['sku is required and must be 3-20 letters, digits or hyphens']);
});

test('rejects a negative price and a fractional stock', () => {
  assert.equal(validateProduct({ ...VALID_PRODUCT, price: -1 }, false).length, 1);
  assert.equal(validateProduct({ ...VALID_PRODUCT, stock: 1.5 }, false).length, 1);
});

test('partial validation only checks the fields that are present', () => {
  assert.deepEqual(validateProduct({ price: 10 }, true), []);
  assert.equal(validateProduct({ stock: -3 }, true).length, 1);
});
