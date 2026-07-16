/* global console, process, setTimeout */

import { existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

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
    port: 3000,
    url: 'http://localhost:3000',
  },
  {
    label: 'ADMIN',
    packageName: '@interview-agent/admin-console',
    port: 3002,
    url: 'http://localhost:3002',
  },
  {
    label: 'API',
    packageName: '@interview-agent/product-api',
    port: 3001,
    url: 'http://localhost:3001/api',
  },
  {
    label: 'AGENT',
    packageName: '@interview-agent/agent-runtime',
    port: 8000,
    url: 'http://localhost:8000',
  },
];

const children = new Set();
let isShuttingDown = false;

function getPnpmInvocation(pnpmArgs) {
  if (!isWindows) return { command: pnpmCommand, args: pnpmArgs };
  return {
    command: process.env.ComSpec ?? 'cmd.exe',
    args: ['/d', '/s', '/c', [pnpmCommand, ...pnpmArgs].join(' ')],
  };
}

function printHelp() {
  console.log(`用法：pnpm dev:local [选项]

选项：
  --infra    同时启动 PostgreSQL、Redis、MinIO 和 Phoenix 容器
  --help     显示帮助

默认启动：
  用户端 http://localhost:3000
  后台端 http://localhost:3002
  Product API http://localhost:3001/api
  Agent Runtime http://localhost:8000

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
    const probe = createServer();
    try {
      await listenOnPort(probe, service.port);
    } catch (error) {
      if (error?.code === 'EADDRINUSE' || error?.code === 'EACCES') {
        occupied.push(`${service.label} ${service.port}`);
      } else {
        fail(`无法检查端口 ${service.port}：${error.message}`);
        return false;
      }
    } finally {
      if (probe.listening) probe.close();
    }
  }

  if (occupied.length > 0) {
    fail(`以下端口已被占用：${occupied.join('、')}。请先停止对应的旧开发服务。`);
    return false;
  }

  return true;
}

function listenOnPort(server, port) {
  return new Promise((resolvePromise, rejectPromise) => {
    const onError = (error) => {
      server.removeListener('listening', onListening);
      rejectPromise(error);
    };
    const onListening = () => {
      server.removeListener('error', onError);
      resolvePromise();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, '127.0.0.1');
  });
}

function writeOutput(label, chunk, pending) {
  const lines = `${pending}${chunk.toString()}`.split(/\r?\n/);
  const nextPending = lines.pop() ?? '';
  for (const line of lines) {
    process.stdout.write(`[${label}] ${line}\n`);
  }
  return nextPending;
}

function pipeOutput(stream, label) {
  let pending = '';
  stream.on('data', (chunk) => {
    pending = writeOutput(label, chunk, pending);
  });
  stream.on('end', () => {
    if (pending) process.stdout.write(`[${label}] ${pending}\n`);
  });
}

function stopChild(child) {
  if (!child.pid || child.exitCode !== null) return;
  if (isWindows) {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return;
  }
  child.kill('SIGTERM');
}

function stopAll(exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  for (const child of children) stopChild(child);
  setTimeout(() => process.exit(exitCode), 250);
}

function startService(service) {
  console.log(`[${service.label}] 启动 ${service.packageName}，端口 ${service.port}`);
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
  for (const service of services) startService(service);
  console.log('访问地址：');
  for (const service of services) console.log(`  ${service.label.padEnd(5)} ${service.url}`);
  console.log('');
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
