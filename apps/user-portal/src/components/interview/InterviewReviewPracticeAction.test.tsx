import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { InterviewReviewPracticeAction } from './InterviewReviewPracticeAction';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

it('shows a confirmation-first practice action for an actionable report', () => {
  const markup = renderToStaticMarkup(
    createElement(InterviewReviewPracticeAction, {
      report: report({ project_deep_dive: 42, jd_core: 58 }),
      sessionId: 'interview-1',
      starting: false,
      onStart: () => undefined,
    }),
  );

  expect(markup).toContain('面试专项回练');
  expect(markup).toContain('项目深挖');
  expect(markup).toContain('开始专项回练');
  expect(markup).toContain('不会复制你的面试回答');
  expect(markup).toContain('推荐依据');
  expect(markup).toContain('最多 5 题 · 约 20 分钟');
  expect(markup).toContain('首要复练 · 项目深挖');
  expect(markup).toContain('项目证据链不足。');
  expect(markup).toContain('没有量化结果');
});

it('does not render an action when the report has no actionable stage', () => {
  const markup = renderToStaticMarkup(
    createElement(InterviewReviewPracticeAction, {
      report: report({ jd_core: 70 }),
      sessionId: 'interview-1',
      starting: false,
      onStart: () => undefined,
    }),
  );

  expect(markup).toBe('');
});

it('uses one primary click to enter the targeted practice', () => {
  const markup = renderToStaticMarkup(
    createElement(InterviewReviewPracticeAction, {
      report: report({ project_deep_dive: 42 }),
      sessionId: 'interview-1',
      starting: false,
      onStart: () => undefined,
    }),
  );

  expect(markup).toContain('开始专项回练');
});

function report(scores: Record<string, number>) {
  return {
    stageScores: Object.entries(scores).map(([stage, score]) => ({
      stage,
      score,
      summary: stage === 'project_deep_dive' ? '项目证据链不足。' : '核心知识不完整。',
      evidence: stage === 'project_deep_dive' ? ['没有量化结果'] : ['缺少边界'],
    })),
  } as never;
}
