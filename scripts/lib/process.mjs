/* global process, setTimeout */

import { spawn } from 'node:child_process';

const DEFAULT_GRACE_PERIOD_MS = 1_000;

/**
 * Windows 下 .cmd 脚本不能直接 spawn，需要交给 cmd.exe 执行。
 */
export function commandInvocation(command, args) {
  if (process.platform !== 'win32' || !command.endsWith('.cmd')) return { command, args };
  return {
    command: process.env.ComSpec ?? 'cmd.exe',
    args: ['/d', '/s', '/c', [command, ...args].join(' ')],
  };
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

/**
 * 按行为子进程输出加统一前缀，跨 chunk 的半行内容会先缓存再输出。
 */
export function pipeOutput(stream, label) {
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

/**
 * 结束一个子进程：Windows 用 taskkill 结束整棵进程树，
 * 其他平台发送 SIGTERM 并最多等待 gracePeriodMs。
 */
export async function stopChildProcess(child, { gracePeriodMs = DEFAULT_GRACE_PERIOD_MS } = {}) {
  if (!child.pid || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    await killWindowsProcessTree(child.pid);
    return;
  }
  const exited = new Promise((resolve) => child.once('close', resolve));
  child.kill('SIGTERM');
  await Promise.race([exited, delay(gracePeriodMs)]);
}

export function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function killWindowsProcessTree(pid) {
  return new Promise((resolve) => {
    const killer = spawn('taskkill', ['/pid', String(pid), '/t', '/f'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    killer.once('error', () => resolve());
    killer.once('close', () => resolve());
  });
}
