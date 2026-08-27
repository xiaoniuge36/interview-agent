/* global console, process, setTimeout */

import { existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { isPortAvailable, isServiceHealthy } from './dev-service-reuse.mjs';
import { commandInvocation, pipeOutput, stopChildProcess } from './lib/process.mjs';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';
const pnpmCommand = isWindows ? 'pnpm.cmd' : 'pnpm';
const composeFile = resolve(rootDir, 'infra/docker/docker-compose.yml');
const envFile = resolve(rootDir, '.env');
const args = new Set(process.argv.slice(2));

const services = [
  {
    label: 'USER',
    packageName: '@interview-agent/user-portal',
    port: 7100,
    url: 'http://localhost:7100',
    hotReload: 'Next.js Fast Refresh',
  },
  {
    label: 'ADMIN',
    packageName: '@interview-agent/admin-console',
    port: 7102,
    url: 'http://localhost:7102',
    hotReload: 'Next.js Fast Refresh',
  },
  {
    label: 'API',
    packageName: '@interview-agent/product-api',
    port: 7101,
    url: 'http://localhost:7101/api',
    hotReload: 'Node.js source watcher + ts-node',
  },
  {
    label: 'AGENT',
    packageName: '@interview-agent/agent-runtime',
    port: 7103,
    url: 'http://localhost:7103',
    hotReload: 'Uvicorn reload',
    health: {
      url: 'http://127.0.0.1:7103/health',
      expectedHealth: { status: 'ok', service: 'agent-runtime' },
    },
  },
];

const children = new Set();
const reusedServices = new Set();
let isShuttingDown = false;

function getPnpmInvocation(pnpmArgs) {
  return commandInvocation(pnpmCommand, pnpmArgs);
}

function printHelp() {
  console.log(`用法：pnpm dev:local [选项]

选项：
  --infra    同时启动 PostgreSQL、Redis、MinIO 和 Phoenix 容器
  --help     显示帮助

默认启动：
  用户端 http://localhost:7100
  后台端 http://localhost:7102
  Product API http://localhost:7101/api
  Agent Runtime http://localhost:7103

按 Ctrl+C 会同时停止所有开发服务。`);
}

function fail(message) {
  console.error(`\n启动失败：${message}`);
  process.exitCode = 1;
}

function ensurePrerequisites() {
  if (!existsSync(envFile)) {
    fail('未找到根目录 .env。首次运行请先执行 Copy-Item .env.example .env。');
    return false;
  }

  const pnpmInvocation = getPnpmInvocation(['--version']);
  const pnpmCheck = spawnSync(pnpmInvocation.command, pnpmInvocation.args, {
    cwd: rootDir,
    stdio: 'ignore',
    windowsHide: true,
  });
  if (pnpmCheck.error || pnpmCheck.status !== 0) {
    fail('未找到 pnpm，请先安装 pnpm 10。');
    return false;
  }

  return true;
}

function runInfrastructure() {
  console.log('正在启动本地基础设施容器……');
  const result = spawnSync(
    'docker',
    [
      'compose',
      '--env-file',
      envFile,
      '-f',
      composeFile,
      'up',
      '-d',
      'postgres',
      'redis',
      'minio',
      'minio-init',
      'phoenix',
    ],
    { cwd: rootDir, stdio: 'inherit', windowsHide: false },
  );

  if (result.error || result.status !== 0) {
    fail('Docker Compose 启动失败，请确认 Docker Desktop 已运行。');
    return false;
  }

  return true;
}

async function ensurePortsAvailable() {
  const occupied = [];
  for (const service of services) {
    try {
      if (await isPortAvailable(service.port)) continue;

      if (service.health && (await isServiceHealthy(service.health))) {
        reusedServices.add(service);
      } else {
        occupied.push(`${service.label} ${service.port}`);
      }
    } catch (error) {
      fail(`无法检查端口 ${service.port}：${error.message}`);
      return false;
    }
  }

  if (occupied.length > 0) {
    fail(`以下端口已被占用：${occupied.join('、')}。请先停止对应的旧开发服务。`);
    return false;
  }

  return true;
}

function stopAll(exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  const exitDelayMs = 250;
  void Promise.all([...children].map((child) => stopChildProcess(child))).finally(() =>
    setTimeout(() => process.exit(exitCode), exitDelayMs),
  );
}

function startService(service) {
  console.log(
    `[${service.label}] 启动 ${service.packageName}，端口 ${service.port}，热更新：${service.hotReload}`,
  );
  const pnpmInvocation = getPnpmInvocation(['--filter', service.packageName, 'dev']);
  const child = spawn(pnpmInvocation.command, pnpmInvocation.args, {
    cwd: rootDir,
    env: process.env,
    stdio: ['inherit', 'pipe', 'pipe'],
    windowsHide: false,
  });

  children.add(child);
  pipeOutput(child.stdout, service.label);
  pipeOutput(child.stderr, service.label);
  child.on('error', (error) => {
    console.error(`[${service.label}] ${error.message}`);
    if (!isShuttingDown) stopAll(1);
  });
  child.on('exit', (code, signal) => {
    children.delete(child);
    if (isShuttingDown) return;
    const reason = signal ? `收到 ${signal}` : `退出码 ${code ?? 1}`;
    console.error(`[${service.label}] 服务已停止（${reason}），正在停止其他服务。`);
    stopAll(code === 0 ? 1 : (code ?? 1));
  });
}

if (args.has('--help')) {
  printHelp();
} else if (![...args].every((arg) => arg === '--infra')) {
  fail('存在未知参数，请使用 --help 查看支持的选项。');
} else if (
  ensurePrerequisites() &&
  (await ensurePortsAvailable()) &&
  (!args.has('--infra') || runInfrastructure())
) {
  console.log('\nInterview Agent 开发环境启动中……');
  console.log('前端页面会在依赖就绪后自动可用，按 Ctrl+C 可全部停止。\n');
  for (const service of services) {
    if (reusedServices.has(service)) {
      console.log(`[${service.label}] Reusing healthy service on port ${service.port}.`);
    } else {
      startService(service);
    }
  }
  console.log('访问地址：');
  for (const service of services) console.log(`  ${service.label.padEnd(5)} ${service.url}`);
  console.log('');
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
