const test = require('node:test');
const assert = require('node:assert/strict');
const { validateUser } = require('../validation');

const VALID_USER = { name: 'Asha Rao', email: 'asha@example.com', course: 'MSc IT', semester: 3 };

test('accepts a complete, valid user', () => {
  assert.deepEqual(validateUser(VALID_USER, false), []);
});

test('reports every missing field', () => {
  assert.equal(validateUser({}, false).length, 4);
});

test('rejects an invalid email', () => {
  const errors = validateUser({ ...VALID_USER, email: 'not-an-email' }, false);
  assert.deepEqual(errors, ['email is required and must be a valid email address']);
});

test('rejects a semester outside 1-8', () => {
  assert.equal(validateUser({ ...VALID_USER, semester: 9 }, false).length, 1);
  assert.equal(validateUser({ ...VALID_USER, semester: 2.5 }, false).length, 1);
});

test('partial validation only checks the fields that are present', () => {
  assert.deepEqual(validateUser({ course: 'BTech' }, true), []);
  assert.equal(validateUser({ name: '  ' }, true).length, 1);
});
