/* global clearTimeout, console, process, setTimeout */

import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLocalDevelopmentEnvironment } from './local-development-environment.mjs';

const RESTART_DELAY_MS = 120;
const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const localEnvironmentFile = resolve(packageDirectory, '../..', '.env');
const childEnvironment = loadLocalDevelopmentEnvironment(process.env, localEnvironmentFile);
const CHILD_ARGS = [
  '--enable-source-maps',
  '-r',
  'ts-node/register/transpile-only',
  '-r',
  'tsconfig-paths/register',
  'src/main.ts',
];

let child;
let restartRequested = false;
let restartTimer;
let shuttingDown = false;

function startChild() {
  child = spawn(process.execPath, CHILD_ARGS, {
    cwd: process.cwd(),
    env: childEnvironment,
    stdio: 'inherit',
    windowsHide: false,
  });
  child.once('error', (error) => console.error(`[API] 启动失败：${error.message}`));
  child.once('exit', handleChildExit);
}

function handleChildExit(code, signal) {
  child = undefined;
  if (shuttingDown) {
    process.exit(code ?? 0);
  }
  if (restartRequested) {
    restartRequested = false;
    startChild();
    return;
  }
  const reason = signal ? `信号 ${signal}` : `退出码 ${code ?? 1}`;
  console.error(`[API] 进程已停止（${reason}），保存源码后将重新启动。`);
}

function restartChild(filename) {
  if (shuttingDown) return;
  console.log(`[API] 检测到 ${filename ?? 'src'} 变化，正在重启…`);
  restartRequested = true;
  if (child) {
    child.kill('SIGKILL');
    return;
  }
  restartRequested = false;
  startChild();
}

function scheduleRestart(filename) {
  clearTimeout(restartTimer);
  restartTimer = setTimeout(() => restartChild(filename), RESTART_DELAY_MS);
}

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  clearTimeout(restartTimer);
  sourceWatcher.close();
  if (child) child.kill('SIGKILL');
  else process.exit(0);
}

const sourceWatcher = watch('src', { recursive: true }, (_event, filename) => {
  scheduleRestart(filename);
});
sourceWatcher.on('error', (error) => {
  console.error(`[API] 源码监听失败：${error.message}`);
  shutdown();
});

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
startChild();
