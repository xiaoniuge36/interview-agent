import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const { AdminAgentDrawerContent } = await import('./AdminAgentDrawer');

const BASE_PROPS: ComponentProps<typeof AdminAgentDrawerContent> = {
  activeConversationId: 'conversation-1',
  activity: '准备就绪',
  config: { enabled: true, message: null, model: 'test-model', provider: 'test' },
  conversationError: null,
  conversationLoading: false,
  conversations: [],
  executionSteps: [],
  loading: false,
  messages: [],
  latestRun: null,
  runHistory: [],
  onAnswer: vi.fn(),
  onCreateConversation: vi.fn(),
  onDeleteConversation: vi.fn(),
  onRenameConversation: vi.fn(),
  onRetry: vi.fn(),
  onSelectConversation: vi.fn(),
  onSend: vi.fn(),
  onSetup: vi.fn(),
  onStop: vi.fn(),
  pageContext: {
    id: 'operations-overview',
    title: '运营总览',
    description: '从积压审核和运行状态开始',
    quickActions: [],
    runtimeInstructions: '仅执行只读查询',
  },
  pendingQuestion: null,
  runError: null,
  status: 'idle',
  tokens: 0,
};

describe('AdminAgentDrawerContent', () => {
  it('keeps conversation history fixed on the left without a visibility toggle', () => {
    const markup = renderToStaticMarkup(createElement(AdminAgentDrawerContent, BASE_PROPS));

    expect(markup).toContain('class="admin-agent-conversation-sidebar"');
    expect(markup).not.toContain('打开历史对话');
    expect(markup).not.toContain('收起历史对话');
  });

  it('renders an actionable localized recovery card for an aborted task', () => {
    const markup = renderToStaticMarkup(
      createElement(AdminAgentDrawerContent, {
        ...BASE_PROPS,
        executionSteps: [{ key: 'query', label: '执行异常：Task aborted', state: 'error' }],
        messages: [
          { id: 'user-1', role: 'user', content: '查看最近失败运行' },
          { id: 'error-1', role: 'error', content: 'Task aborted' },
        ],
        status: 'error',
      }),
    );

    expect(markup).toContain('任务已中止');
    expect(markup).toContain('重新执行');
    expect(markup).toContain('查看执行过程');
    expect(markup).toContain('执行异常：Task aborted');
  });

  it('uses a compact page-context row after a settled response', () => {
    const markup = renderToStaticMarkup(
      createElement(AdminAgentDrawerContent, {
        ...BASE_PROPS,
        messages: [{ id: 'assistant-1', role: 'assistant', content: '查询完成' }],
      }),
    );

    expect(markup).toContain('admin-agent-context-compact');
    expect(markup).not.toContain('从积压审核和运行状态开始');
  });
});

describe('AdminAgentDrawerContent run recovery', () => {
  it('renders a safe retry card for a heartbeat-interrupted run', () => {
    const markup = renderToStaticMarkup(
      createElement(AdminAgentDrawerContent, {
        ...BASE_PROPS,
        latestRun: {
          id: 'run-1',
          conversationId: 'conversation-1',
          retryOfRunId: 'run-origin',
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
        },
        runHistory: [
          {
            id: 'run-1',
            conversationId: 'conversation-1',
            retryOfRunId: 'run-origin',
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
          },
        ],
      }),
    );

    expect(markup).toContain('上次任务已中断');
    expect(markup).toContain('读取导入列表');
    expect(markup).toContain('查询待审核导入');
    expect(markup).toContain('安全重试');
    expect(markup).toContain('运行历史');
    expect(markup).toContain('重试任务');
  });
});
