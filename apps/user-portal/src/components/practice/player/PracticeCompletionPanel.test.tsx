import type { PracticeReport, PracticeSession } from '@interview-agent/contracts';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PracticeCompletionPanel } from './PracticeCompletionPanel';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const session = {
  id: 'session-1',
  status: 'report_ready',
  items: [{ id: 'item-1', sequence: 1, question: { title: 'System design question' } }],
} as PracticeSession;

const report = {
  id: 'report-1',
  tenantId: 'tenant-1',
  sessionId: session.id,
  overallScore: 82,
  summary: '本轮已完成。',
  strengths: [],
  weaknesses: ['异常恢复'],
  nextActions: [],
  reportMarkdown: '# 报告',
  itemEvaluations: [],
  createdAt: '2026-07-21T00:00:00.000Z',
  updatedAt: '2026-07-21T00:00:00.000Z',
} satisfies PracticeReport;

describe('PracticeCompletionPanel', () => {
  it('keeps the AI completion state when a completed report needs to be reloaded', () => {
    const markup = renderToStaticMarkup(
      createElement(PracticeCompletionPanel, {
        session,
        report: null,
        mastery: [],
        message: '',
        onRetry: () => undefined,
        onReviewItem: () => undefined,
        onStartNextRecommendation: () => undefined,
        startingNextRecommendation: false,
      }),
    );

    expect(markup).toContain('AI 复盘已生成');
    expect(markup).toContain('正在重新读取报告内容');
    expect(markup).toContain('重新加载本轮复盘');
    expect(markup).not.toContain('本轮自学已结束');
  });

  it('offers the latest recommendation as the next practice after AI completion', () => {
    const markup = renderToStaticMarkup(
      createElement(PracticeCompletionPanel, {
        session,
        report,
        mastery: [],
        message: '',
        onRetry: () => undefined,
        onReviewItem: () => undefined,
        onStartNextRecommendation: () => undefined,
        startingNextRecommendation: false,
      }),
    );

    expect(markup).toContain('按最新推荐开始下一轮');
    expect(markup).toContain('逐题回看');
  });
});
