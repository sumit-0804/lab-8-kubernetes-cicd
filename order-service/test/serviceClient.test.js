const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

// Keep the failure path fast; serviceClient reads these at load time.
process.env.DEPENDENCY_TIMEOUT_MS = '500';
process.env.DEPENDENCY_RETRIES = '1';
process.env.DEPENDENCY_RETRY_DELAY_MS = '10';
const { callService, DependencyUnavailableError } = require('../serviceClient');

function startStub(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

test('returns status and parsed body when the dependency answers', async (t) => {
  const server = await startStub((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id: 'u1', name: 'Asha' }));
  });
  t.after(() => server.close());

  const result = await callService('user-service', `http://127.0.0.1:${server.address().port}/users/u1`);
  assert.deepEqual(result, { status: 200, body: { id: 'u1', name: 'Asha' } });
});

test('passes a 404 through instead of treating it as unavailable', async (t) => {
  const server = await startStub((req, res) => {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  });
  t.after(() => server.close());

  const result = await callService('user-service', `http://127.0.0.1:${server.address().port}/users/missing`);
  assert.equal(result.status, 404);
});

test('throws DependencyUnavailableError when nothing is listening', async () => {
  // Bind then close to get a port that is known to be free.
  const server = await startStub(() => {});
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));

  await assert.rejects(
    callService('product-service', `http://127.0.0.1:${port}/products/p1`),
    (err) => err instanceof DependencyUnavailableError && err.service === 'product-service'
  );
});
