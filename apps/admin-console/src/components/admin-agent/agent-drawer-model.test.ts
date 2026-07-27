import { describe, expect, it } from 'vitest';
import {
  executionTraceSummary,
  retryPromptBefore,
  resolveAgentErrorPresentation,
  resolveInterruptedRunPresentation,
  shouldExpandAgentContext,
} from './agent-drawer-model';

describe('agent drawer presentation model', () => {
  it('turns the raw page-agent abort into an actionable Chinese status', () => {
    expect(resolveAgentErrorPresentation('Task aborted')).toEqual({
      title: '任务已中止',
      description: '本次任务已停止，已完成的对话仍然保留。',
      retryLabel: '重新执行',
      type: 'warning',
    });
  });

  it('keeps a useful failure detail and offers retry', () => {
    expect(resolveAgentErrorPresentation('模型网关暂时不可用')).toEqual({
      title: '任务执行失败',
      description: '模型网关暂时不可用',
      retryLabel: '重试上一步',
      type: 'error',
    });
  });

  it('finds the user prompt that produced an error', () => {
    const messages = [
      { id: 'u1', role: 'user' as const, content: '查看最近失败运行' },
      { id: 'a1', role: 'assistant' as const, content: '正在查询' },
      { id: 'e1', role: 'error' as const, content: 'Task aborted' },
    ];

    expect(retryPromptBefore(messages, 2)).toBe('查看最近失败运行');
    expect(retryPromptBefore(messages, 0)).toBeNull();
  });

  it('collapses the full context after a settled conversation starts', () => {
    const messages = [{ id: 'a1', role: 'assistant' as const, content: '查询完成' }];

    expect(shouldExpandAgentContext([], 'idle')).toBe(true);
    expect(shouldExpandAgentContext(messages, 'running')).toBe(true);
    expect(shouldExpandAgentContext(messages, 'error')).toBe(true);
    expect(shouldExpandAgentContext(messages, 'idle')).toBe(false);
  });

  it('summarizes the latest execution step without exposing the whole timeline', () => {
    expect(
      executionTraceSummary([
        { key: 'thinking', label: '已完成分析', state: 'completed' },
        { key: 'query', label: '正在查询运行异常', state: 'running' },
      ]),
    ).toEqual({ label: '正在查询运行异常', state: 'running' });
  });
});

describe('interrupted agent run presentation', () => {
  it('turns an interrupted run into a transparent safe-retry presentation', () => {
    expect(
      resolveInterruptedRunPresentation({
        id: 'run-1',
        conversationId: 'conversation-1',
        retryOfRunId: null,
        prompt: '查询待审核导入',
        status: 'interrupted',
        currentStep: '读取导入列表',
        tokenCount: 42,
        traceId: 'trace-1',
        errorCode: 'HEARTBEAT_TIMEOUT',
        errorSummary: '任务心跳超时',
        startedAt: '2026-07-23T08:00:00.000Z',
        finishedAt: '2026-07-23T08:02:00.000Z',
        heartbeatAt: '2026-07-23T08:00:15.000Z',
        updatedAt: '2026-07-23T08:02:00.000Z',
      }),
    ).toEqual({
      title: '上次任务已中断',
      description: '上次执行停在“读取导入列表”。系统不会自动续跑旧步骤；重试会创建一次新的运行。',
      prompt: '查询待审核导入',
      retryLabel: '安全重试',
    });
  });
});
