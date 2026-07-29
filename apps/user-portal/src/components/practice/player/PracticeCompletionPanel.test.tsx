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
  evidence: [{ sourceId: 'chunk-1' }],
  itemEvaluations: [],
  createdAt: '2026-07-21T00:00:00.000Z',
  updatedAt: '2026-07-21T00:00:00.000Z',
} satisfies PracticeReport;

const weakReport = {
  ...report,
  itemEvaluations: [
    {
      id: 'evaluation-weak',
      sessionItemId: 'item-1',
      score: 59,
      feedback: '关键边界仍需补强。',
      missingPoints: ['异常恢复'],
      rubricScores: [{ point: '异常恢复', score: 59 }],
      followUpQuestion: null,
      createdAt: '2026-07-21T00:00:00.000Z',
    },
  ],
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
        onStartWeaknessReview: () => undefined,
        startingWeaknessReview: false,
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
        onStartWeaknessReview: () => undefined,
        startingWeaknessReview: false,
      }),
    );

    expect(markup).toContain('按最新推荐开始下一轮');
    expect(markup).toContain('逐题回看');
    expect(markup).toContain('训练证据');
    expect(markup).toContain('能力画像已更新');
    expect(markup).toContain('用模拟面试检验本轮提升');
    expect(markup).toContain('href="/interview"');
    expect(markup).toContain('查看本轮参考来源（1）');
    expect(markup).toContain('报告事实仍以本轮已验证评价为准');
  });
});

it('prioritizes weakness review when the completed report has a low-score answer', () => {
  const markup = renderToStaticMarkup(
    createElement(PracticeCompletionPanel, {
      session,
      report: weakReport,
      mastery: [],
      message: '',
      onRetry: () => undefined,
      onReviewItem: () => undefined,
      onStartNextRecommendation: () => undefined,
      startingNextRecommendation: false,
      onStartWeaknessReview: () => undefined,
      startingWeaknessReview: false,
    }),
  );

  expect(markup).toContain('复练薄弱项');
  expect(markup).not.toContain('按最新推荐开始下一轮');
});

describe('PracticeCompletionPanel self-study', () => {
  it('明确自主结束只保留回答而不更新能力画像', () => {
    const markup = renderToStaticMarkup(
      createElement(PracticeCompletionPanel, {
        session: { ...session, status: 'submitted' },
        report: null,
        mastery: [],
        message: '',
        onRetry: () => undefined,
        onReviewItem: () => undefined,
        onStartNextRecommendation: () => undefined,
        startingNextRecommendation: false,
        onStartWeaknessReview: () => undefined,
        startingWeaknessReview: false,
      }),
    );

    expect(markup).toContain('回答已保留');
    expect(markup).toContain('不会更新能力画像');
    expect(markup).toContain('选择新的题目继续训练');
    expect(markup).not.toContain('用模拟面试检验本轮提升');
  });
});
