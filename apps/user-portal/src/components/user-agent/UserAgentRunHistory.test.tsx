import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import type { UserAgentRun } from '@/lib/user-page-agent-run-api';
import { UserAgentRunHistory } from './UserAgentRunHistory';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

it('renders an interrupted run as a safe retry and bounded history entry', () => {
  const markup = renderToStaticMarkup(
    <UserAgentRunHistory
      latestRun={interruptedRun}
      runs={[interruptedRun]}
      onRetry={() => undefined}
    />,
  );

  expect(markup).toContain('上次训练建议已中断');
  expect(markup).toContain('安全重试');
  expect(markup).toContain('运行历史');
  expect(markup).toContain('心跳超时');
});

it('keeps a server-side running task visible while the reopened page synchronizes it', () => {
  const runningRun: UserAgentRun = {
    ...interruptedRun,
    status: 'running',
    currentStep: '正在读取近期练习记录',
    errorCode: null,
    errorSummary: null,
    finishedAt: null,
  };

  const markup = renderToStaticMarkup(
    <UserAgentRunHistory latestRun={runningRun} runs={[runningRun]} onRetry={() => undefined} />,
  );

  expect(markup).toContain('训练建议正在运行');
  expect(markup).toContain('正在读取近期练习记录');
  expect(markup).toContain('正在同步运行状态');
  expect(markup).not.toContain('安全重试');
});

const interruptedRun: UserAgentRun = {
  id: 'run-1',
  conversationId: 'conversation-1',
  retryOfRunId: null,
  prompt: '给出本周刷题建议',
  status: 'interrupted',
  currentStep: '读取近期练习记录',
  tokenCount: 42,
  traceId: 'trace-1',
  errorCode: 'HEARTBEAT_TIMEOUT',
  errorSummary: '心跳超时',
  startedAt: '2026-07-27T08:00:00.000Z',
  finishedAt: '2026-07-27T08:02:00.000Z',
  heartbeatAt: '2026-07-27T08:00:15.000Z',
  updatedAt: '2026-07-27T08:02:00.000Z',
};
