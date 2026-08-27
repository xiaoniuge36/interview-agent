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

const interviewReviewSession = {
  ...session,
  id: 'practice-review-1',
  mode: 'interview_review',
  sourceInterviewSessionId: 'interview-source-1',
} as PracticeSession;

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
      dimensionScores: [],
      improvedAnswer: null,
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

    expect(markup).toContain('AI review complete');
    expect(markup).toContain('正在恢复本轮 AI 复盘');
    expect(markup).toContain('正在重新读取报告内容');
    expect(markup).toContain('重新加载本轮复盘');
    expect(markup).not.toContain('按最新推荐开始下一轮');
    expect(markup.indexOf('重新加载本轮复盘')).toBeLessThan(markup.indexOf('逐题回看'));
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

it('recommends the matching learning course when a low-score answer has a topic tag', () => {
  const weakSession = {
    ...session,
    items: [
      {
        id: 'item-1',
        sequence: 1,
        question: { title: 'ReAct 循环', tags: ['ReAct'] },
        evaluation: { score: 40 },
      },
    ],
  } as PracticeSession;
  const markup = renderToStaticMarkup(
    createElement(PracticeCompletionPanel, {
      session: weakSession,
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

  expect(markup).toContain('针对性补课');
  expect(markup).toContain('去学《Agent 基础与上下文工程》');
  expect(markup).toContain('1 道低分题命中 ReAct');
});

it('keeps the completion panel free of course entries when no tag maps to a course', () => {
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

  expect(markup).not.toContain('针对性补课');
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

it('returns interview review practice to its source report with the current evidence context', () => {
  const markup = renderToStaticMarkup(
    createElement(PracticeCompletionPanel, {
      session: interviewReviewSession,
      report: weakReport,
      mastery: [],
      message: '',
      onRetry: () => undefined,
      onReviewItem: () => undefined,
      onStartNextRecommendation: () => undefined,
      startingNextRecommendation: false,
      onStartWeaknessReview: () => undefined,
      startingWeaknessReview: false,
      returnOrigin: {
        status: 'ready',
        courseSlug: '学习路线-01-agent基础与上下文工程',
        courseTitle: 'Agent 基础与上下文工程',
        topicLabel: 'ReAct',
        topicSlug: 'react',
        query: { tags: ['ReAct'], type: 'single_choice' },
      },
    }),
  );

  expect(markup).toContain('回看来源面试复盘');
  expect(markup).toContain('reviewPractice=practice-review-1');
  expect(markup).toContain('interview-source-1');
});

it('makes the fixed mistake book return the only follow-up CTA for a mistake review origin', () => {
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
      returnOrigin: 'mistake-book',
    } as unknown as React.ComponentProps<typeof PracticeCompletionPanel>),
  );

  expect(markup).toContain('回到错题本确认复练状态');
  expect(markup).toContain('href="/reports#mistake-book-heading"');
  expect(markup).not.toContain('复练薄弱项');
  expect(markup).not.toContain('开始新的题单');
  expect(markup).not.toContain('返回题库大厅');
});

it('makes a verified learning return the only follow-up CTA when its report cannot be read', () => {
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
      returnOrigin: {
        status: 'ready',
        courseSlug: '学习路线-01-agent基础与上下文工程',
        courseTitle: 'Agent 基础与上下文工程',
        topicLabel: 'ReAct',
        topicSlug: 'react',
        query: { tags: ['ReAct'], type: 'single_choice' },
      },
    } as unknown as React.ComponentProps<typeof PracticeCompletionPanel>),
  );

  expect(markup).toContain('回到原课程继续学习');
  expect(markup).toContain(
    'href="/learn?doc=%E5%AD%A6%E4%B9%A0%E8%B7%AF%E7%BA%BF-01-agent%E5%9F%BA%E7%A1%80%E4%B8%8E%E4%B8%8A%E4%B8%8B%E6%96%87%E5%B7%A5%E7%A8%8B#learning-course-actions"',
  );
  expect(markup).not.toContain('重新加载本轮复盘');
  expect(markup).not.toContain('开始新的题单');
  expect(markup).not.toContain('返回题库大厅');
});
