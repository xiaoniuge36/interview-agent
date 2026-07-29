/* global Buffer */

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
  assert.equal(Buffer.from(environment.CREDENTIAL_ENCRYPTION_KEY_CURRENT, 'base64').length, 32);
  assert.equal(environment.CREDENTIAL_ENCRYPTION_KEY, undefined);
  assert.equal(environment.AI_CIRCUIT_FAILURE_THRESHOLD, '3');
  assert.equal(environment.AI_CIRCUIT_COOLDOWN_MS, '30000');
  assert.equal(environment.AI_CIRCUIT_HALF_OPEN_MAX_PROBES, '1');
  assert.equal(environment.BACKGROUND_JOB_WORKER_ENABLED, 'true');
  assert.equal(environment.BACKGROUND_JOB_POLL_INTERVAL_MS, '100');
  assert.equal(environment.RAG_TRAINING_ENABLED, 'true');
  assert.equal(environment.RAG_INTERVIEW_ENABLED, 'true');
  assert.equal(environment.RAG_REPORT_ENABLED, 'false');
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
