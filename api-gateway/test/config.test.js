const test = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig } = require('../config');

const VALID_ENV = {
  USER_SERVICE_URL: 'http://user-service:3001',
  PRODUCT_SERVICE_URL: 'http://product-service:3002',
  ORDER_SERVICE_URL: 'http://order-service:3003'
};

test('builds the routing table from the registry variables', () => {
  const config = loadConfig(VALID_ENV);

  assert.equal(config.port, 8080);
  assert.equal(config.proxyTimeoutMs, 10000);
  assert.deepEqual(
    config.routes.map((r) => [r.prefix, r.target]),
    [
      ['/users', 'http://user-service:3001'],
      ['/products', 'http://product-service:3002'],
      ['/orders', 'http://order-service:3003']
    ]
  );
});

test('reads PORT and PROXY_TIMEOUT_MS when set', () => {
  const config = loadConfig({ ...VALID_ENV, PORT: '9090', PROXY_TIMEOUT_MS: '500' });
  assert.equal(config.port, 9090);
  assert.equal(config.proxyTimeoutMs, 500);
});

test('rejects a missing service URL', () => {
  const { ORDER_SERVICE_URL, ...env } = VALID_ENV;
  assert.throws(() => loadConfig(env), /ORDER_SERVICE_URL is not set/);
});

test('rejects a URL that is not http(s)', () => {
  assert.throws(() => loadConfig({ ...VALID_ENV, USER_SERVICE_URL: 'ftp://user-service:3001' }), /must start with http/);
});

test('rejects a URL with a path', () => {
  assert.throws(() => loadConfig({ ...VALID_ENV, USER_SERVICE_URL: 'http://user-service:3001/users' }), /base URL without a path/);
});

test('rejects text that is not a URL', () => {
  assert.throws(() => loadConfig({ ...VALID_ENV, USER_SERVICE_URL: 'user-service' }), /not a valid URL/);
});

test('rejects a non-numeric PORT', () => {
  assert.throws(() => loadConfig({ ...VALID_ENV, PORT: 'abc' }), /PORT must be a positive integer/);
});
