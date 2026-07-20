import type { AgentRunDetailView } from '@interview-agent/contracts';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RunTable } from './RuntimeObservability';

const RUN = {
  id: 'run-1',
  sessionId: 'session-1',
  type: 'mock_interview',
  status: 'succeeded',
  stage: 'tech_basics',
  traceId: 'trace-12345678',
  latencyMs: 9126,
  schemaValid: true,
  fallbackUsed: false,
  attemptCount: 1,
  updatedAt: '2026-07-17T07:31:04.321Z',
  tenant: { id: 'tenant-1', name: 'Niu 的个人空间' },
  user: { id: 'user-1', name: 'Niu', email: 'niu@example.com' },
  sessionTitle: '全栈开发工程师面试训练',
  command: 'answer',
  modelUsage: {
    provider: 'openai_compatible',
    model: 'zai-org/GLM-5.2',
    invocationCount: 1,
    inputTokens: 900,
    outputTokens: 334,
    cacheReadTokens: 120,
    reasoningTokens: 80,
    totalTokens: 1234,
    latencyMs: 8400,
  },
} satisfies AgentRunDetailView;

describe('Agent run observability table', () => {
  it('shows understandable user, model, stage, and token usage columns', () => {
    const markup = renderToStaticMarkup(createElement(RunTable, { runs: [RUN] }));

    expect(markup).toContain('Niu');
    expect(markup).toContain('niu@example.com');
    expect(markup).toContain('技术基础');
    expect(markup).toContain('zai-org/GLM-5.2');
    expect(markup).toContain('1,234');
    expect(markup).toContain('输入 900');
    expect(markup).toContain('输出 334');
    expect(markup).toContain('详情');
  });

  it('marks historical runs whose model usage was not collected', () => {
    const markup = renderToStaticMarkup(
      createElement(RunTable, { runs: [{ ...RUN, modelUsage: null }] }),
    );

    expect(markup).toContain('历史未采集');
  });
});
