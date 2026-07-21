import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';

import {
  commandInvocation,
  formatOutput,
  runCommand,
  waitForHttp,
  waitForProcess,
} from './child-process.mjs';

test('waits for a healthy HTTP endpoint', async (context) => {
  const server = createServer((_request, response) => response.end('ok'));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();

  await waitForHttp(`http://127.0.0.1:${address.port}`, { timeoutMs: 500 });
});

test('returns the exit code of a successful child command', async () => {
  const result = await runCommand(process.execPath, ['--eval', 'process.exit(0)']);

  assert.equal(result, 0);
});

test('rejects a failed child command with its label', async () => {
  await assert.rejects(
    () => runCommand(process.execPath, ['--eval', 'process.exit(3)'], { label: 'E2E setup' }),
    /E2E setup.*3/,
  );
});

test('wraps Windows command scripts in cmd.exe', () => {
  const invocation = commandInvocation('pnpm.cmd', ['--version']);

  if (process.platform === 'win32') {
    assert.equal(invocation.command, process.env.ComSpec ?? 'cmd.exe');
    assert.deepEqual(invocation.args, ['/d', '/s', '/c', 'pnpm.cmd --version']);
  } else {
    assert.deepEqual(invocation, { command: 'pnpm.cmd', args: ['--version'] });
  }
});

test('rejects when a started service exits before health checks pass', async () => {
  const child = {
    exitCode: null,
    once: (event, callback) => {
      if (event === 'close') callback(1);
    },
  };

  await assert.rejects(() => waitForProcess(child, 'API'), /API exited with code 1/);
});

test('prefixes every child output line with its service label', () => {
  assert.equal(
    formatOutput('PLAYWRIGHT', 'first\nsecond\n'),
    '[PLAYWRIGHT] first\n[PLAYWRIGHT] second\n',
  );
});
