import { spawn } from 'node:child_process';

import {
  commandInvocation,
  delay,
  formatOutput,
  pipeOutput,
  stopChildProcess,
} from '../lib/process.mjs';

const HEALTH_RETRY_DELAY_MS = 250;
const REQUEST_TIMEOUT_MS = 1_000;

export { commandInvocation, formatOutput };

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

export function playwrightArguments(arguments_) {
  const forwarded = arguments_[0] === '--' ? arguments_.slice(1) : arguments_;
  const workers = forwarded.some(
    (argument) => argument === '--workers' || argument.startsWith('--workers='),
  )
    ? []
    : ['--workers=1'];
  return ['exec', 'playwright', 'test', ...workers, ...forwarded];
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

export function stopService(child) {
  return stopChildProcess(child, { gracePeriodMs: REQUEST_TIMEOUT_MS });
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

function messageFor(error) {
  return error instanceof Error ? error.message : 'service unavailable';
}
