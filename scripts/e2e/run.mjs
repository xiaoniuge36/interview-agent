/* global URL, console, process, setTimeout */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  runCommand,
  startService,
  stopService,
  waitForHttp,
  waitForProcess,
} from './child-process.mjs';
import { createE2eEnvironment } from './environment.mjs';

const E2E_MODEL_PORT = '4100';
const E2E_RUNTIME_PORT = '8100';
const E2E_USER_PORT = '3100';
const E2E_ADMIN_PORT = '3102';
const E2E_DATABASE_PORT = '55432';
const E2E_REDIS_PORT = '56379';
const HEALTH_TIMEOUT_MS = 120_000;
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const E2E_POSTGRES_CONTAINER = 'interview-agent-e2e-postgres';
const E2E_POSTGRES_IMAGE = 'pgvector/pgvector:0.8.1-pg16';

export function serviceCommands(environment) {
  const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  return [
    {
      label: 'MODEL',
      command: process.execPath,
      args: ['scripts/e2e/model-stub.mjs', E2E_MODEL_PORT],
    },
    {
      label: 'AGENT',
      command: 'uv',
      cwd: resolve(rootDir, 'apps/agent-runtime'),
      args: [
        'run',
        '--extra',
        'dev',
        'uvicorn',
        'app.main:app',
        '--host',
        '127.0.0.1',
        '--port',
        E2E_RUNTIME_PORT,
      ],
    },
    {
      label: 'API',
      command: process.execPath,
      args: [
        '--enable-source-maps',
        '-r',
        'ts-node/register/transpile-only',
        '-r',
        'tsconfig-paths/register',
        'src/main.ts',
      ],
      cwd: resolve(rootDir, 'apps/product-api'),
      environment: { ...environment, E2E_PRESERVE_ENVIRONMENT: 'true' },
    },
    {
      label: 'USER',
      command: pnpm,
      args: [
        '--filter',
        '@interview-agent/user-portal',
        'exec',
        'next',
        'dev',
        '-p',
        E2E_USER_PORT,
      ],
    },
    {
      label: 'ADMIN',
      command: pnpm,
      args: [
        '--filter',
        '@interview-agent/admin-console',
        'exec',
        'next',
        'dev',
        '-p',
        E2E_ADMIN_PORT,
      ],
    },
  ].map((service) => ({
    ...service,
    environment: service.environment ?? environment,
    cwd: service.cwd ?? rootDir,
  }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main();
}

async function main() {
  try {
    await runE2e();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

async function runE2e() {
  const environment = createE2eEnvironment(loadSourceEnvironment(), {
    databaseName: 'interview_agent',
    databasePort: E2E_DATABASE_PORT,
  });
  const services = [];
  let postgres = null;
  let redis = null;
  try {
    postgres = await startE2ePostgres(environment);
    redis = await startE2eRedis(environment);
    await prepareDatabase(environment);
    for (const service of serviceCommands(environment)) {
      services.push({ child: startService(service, { cwd: service.cwd }), label: service.label });
    }
    await waitForServices(services);
    await runCommand(pnpmCommand(), ['exec', 'playwright', 'test'], {
      cwd: rootDir,
      env: environment,
      label: 'Playwright E2E',
    });
  } finally {
    await Promise.all(services.reverse().map(({ child }) => stopService(child)));
    if (postgres) await removeE2ePostgres(postgres);
    if (redis) await removeE2eRedis(redis);
  }
}

async function waitForServices(services) {
  const endpoints = [
    ['AGENT', 'http://127.0.0.1:8100/health/ready'],
    ['API', 'http://127.0.0.1:3101/api/health/ready'],
    ['USER', 'http://127.0.0.1:3100'],
    ['ADMIN', 'http://127.0.0.1:3102'],
  ];
  const processFailures = Promise.race(
    services.map(({ child, label }) => waitForProcess(child, label)),
  );
  for (const [label, endpoint] of endpoints) {
    console.info(`[E2E] waiting for ${label} at ${endpoint}`);
    await Promise.race([waitForHttp(endpoint, { timeoutMs: HEALTH_TIMEOUT_MS }), processFailures]);
    console.info(`[E2E] ${label} is ready`);
  }
}

async function prepareDatabase(environment) {
  const options = { cwd: rootDir, env: environment };
  const pnpm = pnpmCommand();
  await runCommand(
    pnpm,
    [
      '--filter',
      '@interview-agent/product-api',
      'exec',
      'prisma',
      'migrate',
      'deploy',
      '--schema',
      'prisma/schema',
    ],
    {
      ...options,
      label: 'E2E migration deploy',
    },
  );
  await runCommand(pnpm, ['exec', 'tsx', 'apps/product-api/prisma/seed.ts'], {
    ...options,
    label: 'E2E question seed',
  });
  await runCommand(pnpm, ['exec', 'tsx', 'apps/product-api/prisma/bootstrap-admin.ts'], {
    ...options,
    label: 'E2E administrator seed',
  });
}

async function startE2ePostgres(environment) {
  const url = new URL(environment.DATABASE_URL);
  const database = url.pathname.slice(1);
  const user = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);
  const container = `${E2E_POSTGRES_CONTAINER}-${process.pid}`;
  await runCommand(
    'docker',
    [
      'run',
      '--detach',
      '--rm',
      '--name',
      container,
      '--publish',
      `${E2E_DATABASE_PORT}:5432`,
      '--env',
      `POSTGRES_DB=${database}`,
      '--env',
      `POSTGRES_USER=${user}`,
      '--env',
      `POSTGRES_PASSWORD=${password}`,
      E2E_POSTGRES_IMAGE,
    ],
    { cwd: rootDir, env: environment, label: 'E2E PostgreSQL start' },
  );
  await waitForDockerPostgres(container, environment);
  return container;
}

async function startE2eRedis(environment) {
  const container = `interview-agent-e2e-redis-${process.pid}`;
  await runCommand(
    'docker',
    [
      'run',
      '--detach',
      '--rm',
      '--name',
      container,
      '--publish',
      `${E2E_REDIS_PORT}:6379`,
      'redis:7.4-alpine',
    ],
    { cwd: rootDir, env: environment, label: 'E2E Redis start' },
  );
  await waitForDockerRedis(container, environment);
  return container;
}

async function waitForDockerRedis(container, environment) {
  const deadline = Date.now() + HEALTH_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      await runCommand('docker', ['exec', container, 'redis-cli', 'ping'], {
        cwd: rootDir,
        env: environment,
        label: 'E2E Redis health',
        stdio: 'ignore',
      });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error('Timed out waiting for E2E Redis.');
}

async function waitForDockerPostgres(container, environment) {
  const deadline = Date.now() + HEALTH_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      await runCommand(
        'docker',
        ['exec', container, 'pg_isready', '-U', 'interview_agent', '-d', 'interview_agent'],
        {
          cwd: rootDir,
          env: environment,
          label: 'E2E PostgreSQL health',
          stdio: 'ignore',
        },
      );
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error('Timed out waiting for E2E PostgreSQL.');
}

function removeE2ePostgres(container) {
  return runCommand('docker', ['rm', '--force', container], {
    cwd: rootDir,
    label: 'E2E PostgreSQL cleanup',
    stdio: 'ignore',
  }).catch(() => undefined);
}

function removeE2eRedis(container) {
  return runCommand('docker', ['rm', '--force', container], {
    cwd: rootDir,
    label: 'E2E Redis cleanup',
    stdio: 'ignore',
  }).catch(() => undefined);
}

function loadSourceEnvironment() {
  const localValues = parseEnvironmentFile(resolve(rootDir, '.env'));
  const source = { ...localValues, ...process.env };
  if (!source.DATABASE_URL || !source.REDIS_URL) {
    throw new Error('E2E requires DATABASE_URL and REDIS_URL in .env or the current environment.');
  }
  return source;
}

function parseEnvironmentFile(path) {
  try {
    return Object.fromEntries(
      readFileSync(path, 'utf8')
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
        .map((line) => line.split(/=(.*)/su))
        .filter(([key, value]) => key && value !== undefined),
    );
  } catch {
    return {};
  }
}

function pnpmCommand() {
  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}
