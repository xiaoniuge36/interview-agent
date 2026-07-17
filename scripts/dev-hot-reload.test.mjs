import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const PHASE_DEVELOPMENT_SERVER = 'phase-development-server';
const PHASE_PRODUCTION_BUILD = 'phase-production-build';

test('Next 前台与后台隔离开发和生产构建目录', () => {
  for (const app of ['user-portal', 'admin-console']) {
    const config = require(resolve(rootDir, `apps/${app}/next.config.js`));
    const development = resolveConfig(config, PHASE_DEVELOPMENT_SERVER);
    const production = resolveConfig(config, PHASE_PRODUCTION_BUILD);
    const tsconfig = jsonFile(`apps/${app}/tsconfig.json`);

    assert.equal(development.distDir, '.next-dev', `${app} 开发目录`);
    assert.equal(production.distDir, '.next', `${app} 生产目录`);
    assert.ok(tsconfig.include.includes('.next-dev/types/**/*.ts'), `${app} 开发类型目录`);
  }
});

test('四个开发服务均启用热更新或自动重载', () => {
  assert.match(packageScript('apps/user-portal', 'dev'), /next dev/);
  assert.match(packageScript('apps/admin-console', 'dev'), /next dev/);
  const productApiDev = packageScript('apps/product-api', 'dev');
  const productApiWatcher = readFileSync(
    resolve(rootDir, 'apps/product-api/scripts/dev-watch.mjs'),
    'utf8',
  );
  assert.equal(productApiDev, 'node scripts/dev-watch.mjs');
  assert.doesNotMatch(productApiDev, /nest start --watch/);
  assert.match(productApiWatcher, /watch\('src', \{ recursive: true \}/);
  assert.match(productApiWatcher, /ts-node\/register\/transpile-only/);
  assert.match(productApiWatcher, /tsconfig-paths\/register/);
  assert.match(productApiWatcher, /child\.kill\('SIGKILL'\)/);
  assert.doesNotMatch(productApiWatcher, /taskkill/);
  assert.match(packageScript('apps/agent-runtime', 'dev'), /uvicorn .*--reload/);
});

test('开发缓存被忽略且热更新测试纳入根测试命令', () => {
  const gitignore = readFileSync(resolve(rootDir, '.gitignore'), 'utf8');
  const rootPackage = packageJson('.');

  assert.match(gitignore, /^\.next-dev\/$/m);
  assert.match(rootPackage.scripts.test, /dev-hot-reload\.test\.mjs/);
});

function resolveConfig(config, phase) {
  return typeof config === 'function' ? config(phase, { defaultConfig: {} }) : config;
}

function packageScript(directory, name) {
  return packageJson(directory).scripts[name];
}

function packageJson(directory) {
  return jsonFile(`${directory}/package.json`);
}

function jsonFile(path) {
  return JSON.parse(readFileSync(resolve(rootDir, path), 'utf8'));
}
