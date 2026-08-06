import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';

import { isPortAvailable, isServiceHealthy } from './dev-service-reuse.mjs';

async function startServer(handler) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return { server, url: `http://127.0.0.1:${port}/health` };
}

test('reuses only the expected healthy local service', async (context) => {
  const healthy = await startServer((_request, response) => {
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ status: 'ok', service: 'agent-runtime' }));
  });
  const unexpected = await startServer((_request, response) => {
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ status: 'ok', service: 'other-service' }));
  });
  context.after(() =>
    Promise.all(
      [healthy, unexpected].map(({ server }) => new Promise((resolve) => server.close(resolve))),
    ),
  );

  const expectedHealth = { status: 'ok', service: 'agent-runtime' };
  assert.equal(await isServiceHealthy({ url: healthy.url, expectedHealth }), true);
  assert.equal(await isServiceHealthy({ url: unexpected.url, expectedHealth }), false);
});

test('detects a wildcard-bound port as unavailable', async (context) => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '0.0.0.0', resolve));
  const { port } = server.address();
  context.after(() => new Promise((resolve) => server.close(resolve)));

  assert.equal(await isPortAvailable(port), false);
});

test('detects an IPv6-only wildcard-bound port as unavailable', async (context) => {
  const server = createServer();
  await new Promise((resolve) => server.listen({ port: 0, host: '::', ipv6Only: true }, resolve));
  const { port } = server.address();
  context.after(() => new Promise((resolve) => server.close(resolve)));

  assert.equal(await isPortAvailable(port), false);
});
