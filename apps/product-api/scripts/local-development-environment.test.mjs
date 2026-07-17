import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { loadLocalDevelopmentEnvironment } from './local-development-environment.mjs';

test('local .env overrides inherited authentication settings for the development API', () => {
  const fixtureDirectory = mkdtempSync(join(tmpdir(), 'interview-agent-env-'));
  const environmentFile = join(fixtureDirectory, '.env');
  writeFileSync(environmentFile, 'AUTH_MODE=jwt_hs256\nJWT_ISSUER=local-issuer\n', 'utf8');

  try {
    const result = loadLocalDevelopmentEnvironment(
      { AUTH_MODE: 'development', PATH: 'inherited-path' },
      environmentFile,
    );

    assert.deepEqual(result, {
      AUTH_MODE: 'jwt_hs256',
      JWT_ISSUER: 'local-issuer',
      PATH: 'inherited-path',
    });
  } finally {
    rmSync(fixtureDirectory, { force: true, recursive: true });
  }
});
