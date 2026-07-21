/* global URL */

import { randomBytes } from 'node:crypto';

const E2E_DATABASE_SUFFIX = '_e2e';
const E2E_DATABASE_PORT = '55432';
const API_PORT = '3101';
const USER_PORT = '3100';
const ADMIN_PORT = '3102';
const RUNTIME_PORT = '8100';
const MODEL_STUB_PORT = '4100';
const REDIS_PORT = '56379';
const LOOPBACK_HOST = '127.0.0.1';
const E2E_ADMIN_EMAIL = 'e2e-admin@interview-agent.test';

export function createE2eEnvironment(source, options = {}) {
  const databaseUrl = e2eDatabaseUrl(
    source.DATABASE_URL,
    options.databaseName,
    options.databasePort ?? E2E_DATABASE_PORT,
  );
  return {
    ...source,
    NODE_ENV: 'test',
    API_HOST: LOOPBACK_HOST,
    API_PORT,
    DATABASE_URL: databaseUrl,
    REDIS_URL: `redis://${LOOPBACK_HOST}:${REDIS_PORT}`,
    REDIS_REQUIRED: 'true',
    AUTH_MODE: 'jwt_hs256',
    JWT_SECRET: secureValue(48),
    JWT_ISSUER: 'interview-agent-e2e',
    JWT_AUDIENCE: 'interview-agent-e2e-web',
    INTERNAL_AGENT_TOKEN: secureValue(32),
    CREDENTIAL_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
    CREDENTIAL_ENCRYPTION_KEY_VERSION: '1',
    AGENT_RUNTIME_FALLBACK_ENABLED: 'false',
    API_CORS_ORIGINS: `http://${LOOPBACK_HOST}:${USER_PORT},http://${LOOPBACK_HOST}:${ADMIN_PORT}`,
    AGENT_RUNTIME_URL: `http://${LOOPBACK_HOST}:${RUNTIME_PORT}`,
    AGENT_RUNTIME_MODEL_GATEWAY_URL: `http://${LOOPBACK_HOST}:${API_PORT}/api/internal/model-invocations`,
    NEXT_PUBLIC_API_BASE_URL: `http://${LOOPBACK_HOST}:${API_PORT}/api`,
    E2E_API_URL: `http://${LOOPBACK_HOST}:${API_PORT}/api`,
    NEXT_PUBLIC_AUTH_MODE: 'local',
    NEXT_PUBLIC_USER_AUTH_MODE: 'local',
    NEXT_PUBLIC_ADMIN_AUTH_MODE: 'local',
    LOCAL_ADMIN_EMAIL: E2E_ADMIN_EMAIL,
    LOCAL_ADMIN_NAME: 'E2E Platform Admin',
    LOCAL_ADMIN_PASSWORD: secureValue(18),
    E2E_ADMIN_EMAIL,
    E2E_ADMIN_URL: `http://${LOOPBACK_HOST}:${ADMIN_PORT}`,
    E2E_MODEL_STUB_URL: `http://${LOOPBACK_HOST}:${MODEL_STUB_PORT}/v1`,
    E2E_USER_URL: `http://${LOOPBACK_HOST}:${USER_PORT}`,
  };
}

function secureValue(bytes) {
  return randomBytes(bytes).toString('base64url');
}

function e2eDatabaseUrl(databaseUrl, databaseName, databasePort) {
  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error('E2E requires a PostgreSQL DATABASE_URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('E2E requires a PostgreSQL DATABASE_URL.');
  }
  const database = parsed.pathname.replace(/^\//u, '');
  if (!database) throw new Error('E2E requires a database name in DATABASE_URL.');
  const nextDatabase =
    databaseName ??
    (database.endsWith(E2E_DATABASE_SUFFIX) ? database : `${database}${E2E_DATABASE_SUFFIX}`);
  parsed.pathname = `/${nextDatabase}`;
  parsed.hostname = LOOPBACK_HOST;
  parsed.port = databasePort ?? parsed.port;
  parsed.searchParams.set('schema', 'public');
  return parsed.toString();
}
