import type { PracticeSession } from '@interview-agent/contracts';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PracticeLearningNotice } from './PracticeCoachPanel';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const pendingItem = {
  id: 'item-1',
  sequence: 1,
  answer: '我会先验证搜索结果。',
  evaluation: null,
  question: {
    id: 'question-1',
    title: '如何提高搜索结果可靠性？',
    stem: '请说明你的判断。',
    type: 'short_answer',
    difficulty: 'medium',
    tags: ['检索增强', '结果验证'],
  },
} as PracticeSession['items'][number];

describe('PracticeLearningNotice', () => {
  it('说明单题评价完成后才会在整轮复盘时更新能力画像', () => {
    const pendingMarkup = renderToStaticMarkup(
      createElement(PracticeLearningNotice, { item: pendingItem }),
    );
    const evaluatedMarkup = renderToStaticMarkup(
      createElement(PracticeLearningNotice, {
        item: { ...pendingItem, evaluation: evaluation() },
      }),
    );

    expect(pendingMarkup).toContain('等待本题 AI 评价');
    expect(pendingMarkup).toContain('整轮 AI 复盘时更新');
    expect(evaluatedMarkup).toContain('本题反馈已就绪');
    expect(evaluatedMarkup).toContain('完成整轮 AI 复盘后');
    expect(evaluatedMarkup).toContain('检索增强、结果验证');
  });
});

function evaluation() {
  return {
    id: 'evaluation-1',
    sessionItemId: 'item-1',
    score: 82,
    feedback: '回答覆盖了验证路径。',
    missingPoints: [],
    rubricScores: [],
    followUpQuestion: null,
    createdAt: '2026-07-22T00:00:00.000Z',
  };
}
