import assert from 'node:assert/strict';
import test from 'node:test';

import { createE2eEnvironment } from './environment.mjs';
import { serviceCommands } from './run.mjs';

const environment = createE2eEnvironment({
  DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/interview_agent?schema=public',
  REDIS_URL: 'redis://:redis@127.0.0.1:6379',
});

test('starts every E2E service with its isolated endpoint', () => {
  const services = serviceCommands(environment);

  assert.deepEqual(
    services.map((service) => service.label),
    ['MODEL', 'AGENT', 'API', 'USER', 'ADMIN'],
  );
  assert.doesNotMatch(services[1].args.join(' '), /--project/);
  assert.deepEqual(services[1].args.slice(-2), ['--port', '8100']);
  assert.match(services[1].cwd, /apps[\\/]agent-runtime$/);
  assert.match(services[2].args.join(' '), /src\/main\.ts/);
  assert.match(services[2].cwd, /apps[\\/]product-api$/);
  assert.deepEqual(services[3].args.slice(-2), ['-p', '3100']);
  assert.deepEqual(services[4].args.slice(-2), ['-p', '3102']);
});

test('does not reuse the developer environment ports', () => {
  for (const service of serviceCommands(environment)) {
    assert.doesNotMatch(service.args.join(' '), /\b3000\b|\b3001\b|\b3002\b|\b8000\b/);
  }
});

test('uses only loopback database and Redis endpoints for E2E services', () => {
  const isolated = createE2eEnvironment({
    DATABASE_URL: 'postgresql://developer:password@database.example.test:5432/interview_agent',
    REDIS_URL: 'redis://redis.example.test:6379',
  });

  assert.match(isolated.DATABASE_URL, /@127\.0\.0\.1:55432\//);
  assert.match(isolated.REDIS_URL, /^redis:\/\/127\.0\.0\.1:56379$/);
  assert.equal(isolated.REDIS_REQUIRED, 'true');
});
