import assert from 'node:assert/strict';
import test from 'node:test';

import { createE2eEnvironment } from './environment.mjs';

const BASE_DATABASE_URL =
  'postgresql://postgres:postgres@127.0.0.1:5432/interview_agent?schema=public';

test('uses isolated ports and the e2e database', () => {
  const environment = createE2eEnvironment({ DATABASE_URL: BASE_DATABASE_URL });

  assert.match(environment.DATABASE_URL, /interview_agent_e2e/);
  assert.match(environment.DATABASE_URL, /schema=public/);
  assert.equal(environment.API_PORT, '3101');
  assert.equal(environment.AGENT_RUNTIME_URL, 'http://127.0.0.1:8100');
  assert.equal(environment.NEXT_PUBLIC_API_BASE_URL, 'http://127.0.0.1:3101/api');
  assert.equal(environment.AUTH_MODE, 'jwt_hs256');
  assert.equal(environment.NEXT_PUBLIC_USER_AUTH_MODE, 'local');
  assert.equal(environment.NEXT_PUBLIC_ADMIN_AUTH_MODE, 'local');
  assert.equal(Buffer.from(environment.CREDENTIAL_ENCRYPTION_KEY, 'base64').length, 32);
  assert.equal(environment.AGENT_RUNTIME_CHECKPOINT_DATABASE_URL, undefined);
});

test('retains database query parameters while replacing the database', () => {
  const environment = createE2eEnvironment({
    DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/interview_agent?sslmode=disable',
  });

  assert.match(environment.DATABASE_URL, /sslmode=disable/);
  assert.match(environment.DATABASE_URL, /interview_agent_e2e/);
});

test('rejects a non-PostgreSQL test database URL', () => {
  assert.throws(
    () => createE2eEnvironment({ DATABASE_URL: 'mysql://localhost/interview_agent' }),
    /PostgreSQL/,
  );
});
