import { spawn } from 'node:child_process';

const HEALTH_RETRY_DELAY_MS = 250;
const REQUEST_TIMEOUT_MS = 1_000;

export function runCommand(command, args, options = {}) {
  const label = options.label ?? command;
  return new Promise((resolve, reject) => {
    const invocation = commandInvocation(command, args);
    const child = spawn(invocation.command, invocation.args, commandOptions(options));
    pipeOutput(child.stdout, label);
    pipeOutput(child.stderr, label);
    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) resolve(code);
      else reject(new Error(`${label} exited with code ${code ?? 1}.`));
    });
  });
}

export function startService(service, options = {}) {
  const invocation = commandInvocation(service.command, service.args);
  const child = spawn(
    invocation.command,
    invocation.args,
    commandOptions({ ...options, env: service.environment }),
  );
  pipeOutput(child.stdout, service.label);
  pipeOutput(child.stderr, service.label);
  child.once('error', (error) => console.error(`[${service.label}] ${error.message}`));
  return child;
}

export function commandInvocation(command, args) {
  if (process.platform !== 'win32' || !command.endsWith('.cmd')) return { command, args };
  return {
    command: process.env.ComSpec ?? 'cmd.exe',
    args: ['/d', '/s', '/c', [command, ...args].join(' ')],
  };
}

export async function stopService(child) {
  if (!child.pid || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    await runCommand('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
      label: `E2E process ${child.pid} cleanup`,
      stdio: 'ignore',
    }).catch(() => undefined);
    return;
  }
  const exited = onceExit(child);
  child.kill('SIGTERM');
  await Promise.race([exited, delay(REQUEST_TIMEOUT_MS)]);
}

export async function waitForHttp(url, { timeoutMs }) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(HEALTH_RETRY_DELAY_MS);
  }
  throw new Error(`Timed out waiting for ${url}: ${messageFor(lastError)}`);
}

export function waitForProcess(child, label) {
  return new Promise((resolve, reject) => {
    if (child.exitCode !== null) {
      reject(new Error(`${label} exited with code ${child.exitCode}.`));
      return;
    }
    child.once('error', reject);
    child.once('close', (code) => reject(new Error(`${label} exited with code ${code ?? 1}.`)));
  });
}

function commandOptions(options) {
  return {
    cwd: options.cwd,
    env: options.env,
    stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  };
}

function pipeOutput(stream, label) {
  let pending = '';
  stream?.on('data', (chunk) => {
    const output = pending + String(chunk);
    const lastNewline = output.lastIndexOf('\n');
    if (lastNewline === -1) {
      pending = output;
      return;
    }
    process.stdout.write(formatOutput(label, output.slice(0, lastNewline + 1)));
    pending = output.slice(lastNewline + 1);
  });
  stream?.once('end', () => {
    if (pending) process.stdout.write(formatOutput(label, pending));
  });
}

export function formatOutput(label, output) {
  const text = String(output).replace(/\r\n/gu, '\n');
  if (!text) return '';
  const hasTrailingNewline = text.endsWith('\n');
  const lines = text.split('\n');
  if (hasTrailingNewline) lines.pop();
  const prefixed = lines.map((line) => `[${label}] ${line}`).join('\n');
  return hasTrailingNewline ? `${prefixed}\n` : prefixed;
}

function onceExit(child) {
  return new Promise((resolve) => child.once('close', resolve));
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function messageFor(error) {
  return error instanceof Error ? error.message : 'service unavailable';
}
