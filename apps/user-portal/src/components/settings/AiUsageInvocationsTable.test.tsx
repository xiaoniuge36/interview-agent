import type { AiInvocationPage } from '@interview-agent/contracts';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { InvocationsTable, operationLabel, statusLabel } from './AiUsageInvocationsTable';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('InvocationsTable', () => {
  it('renders one row per invocation with latency, tokens and status', () => {
    const markup = renderToStaticMarkup(
      createElement(InvocationsTable, { page: page(), loading: false }),
    );

    expect(markup).toContain('<table');
    expect(markup).toContain('单题评价');
    expect(markup).toContain('deepseek-chat');
    expect(markup).toContain('420 ms');
    expect(markup).toContain('失败');
    // token 缺失时用占位符而不是 0，避免误导统计
    expect(markup).toContain('—');
  });

  it('shows a readable empty state for a period without invocations', () => {
    const markup = renderToStaticMarkup(
      createElement(InvocationsTable, { page: { ...page(), items: [], total: 0 }, loading: false }),
    );

    expect(markup).toContain('该时间范围内没有调用记录');
    expect(markup).not.toContain('<tbody><tr><td>');
  });

  it('keeps the loading copy when no page has been loaded yet', () => {
    const markup = renderToStaticMarkup(
      createElement(InvocationsTable, { page: null, loading: true }),
    );

    expect(markup).toContain('正在读取调用记录');
  });
});

describe('AI usage labels', () => {
  it('names every invocation operation instead of showing raw codes', () => {
    expect(operationLabel('model_connection_test')).toBe('连接测试');
    expect(operationLabel('practice_evaluation')).toBe('单题评价');
    expect(operationLabel('practice_report')).toBe('练习报告');
    expect(operationLabel('user_page_agent')).toBe('训练助教');
    expect(operationLabel('admin_page_agent')).toBe('后台助手');
    expect(operationLabel('embedding')).toBe('向量化');
    expect(operationLabel('interview_next')).toBe('模拟面试');
  });

  it('translates invocation statuses', () => {
    expect(statusLabel('succeeded')).toBe('成功');
    expect(statusLabel('failed')).toBe('失败');
    expect(statusLabel('cancelled')).toBe('已取消');
  });
});

function page(): AiInvocationPage {
  return {
    period: '7d',
    range: { startAt: '2026-07-10T00:00:00.000Z', endAt: '2026-07-17T00:00:00.000Z' },
    page: 1,
    pageSize: 10,
    total: 1,
    items: [
      {
        id: 'invoke-1',
        operation: 'practice_evaluation',
        provider: 'deepseek',
        model: 'deepseek-chat',
        status: 'failed',
        latencyMs: 420,
        totalTokens: null,
        errorCode: 'MODEL_PROVIDER_RATE_LIMITED',
        createdAt: '2026-07-17T10:00:00.000Z',
      },
    ],
  };
}
