import type { PracticeSession } from '@interview-agent/contracts';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PracticeQuestionStage } from './PracticeQuestionStage';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('PracticeQuestionStage', () => {
  it('将保存和保存并进入下一题放在同一操作区', () => {
    const markup = renderStage({ draft: '这是尚未保存的回答。' });

    expect(markup).toContain('仅保存');
    expect(markup).toContain('保存并进入下一题 →');
    expect(markup).toContain('practice-answer-actions');
  });

  it('对已保存回答提供直接进入下一题的主操作', () => {
    const markup = renderStage({ draft: '这是已保存的回答。', answer: '这是已保存的回答。' });

    expect(markup).toContain('进入下一题 →');
    expect(markup).not.toContain('保存并进入下一题 →');
  });

  it('在最后一题突出保存并进入 AI 评价', () => {
    const markup = renderStage({ currentIndex: 1, draft: '最后一题的新回答。', total: 2 });

    expect(markup).toContain('保存并进入 AI 评价 →');
    expect(markup).toContain('practice-save-feedback-button');
  });

  it('在最后一题已保存时可直接进入 AI 评价', () => {
    const markup = renderStage({
      answer: '最后一题已保存的回答。',
      currentIndex: 1,
      draft: '最后一题已保存的回答。',
      total: 2,
    });

    expect(markup).toContain('进入 AI 评价 →');
    expect(markup).not.toContain('保存并进入 AI 评价 →');
  });
});

function renderStage({
  answer = null,
  currentIndex = 0,
  draft = '',
  total = 2,
}: {
  answer?: string | null;
  currentIndex?: number;
  draft?: string;
  total?: number;
}) {
  return renderToStaticMarkup(
    createElement(PracticeQuestionStage, {
      item: item(answer),
      draft,
      busy: null,
      currentIndex,
      total,
      onDraft: () => undefined,
      onSave: () => undefined,
      onSaveAndNext: () => undefined,
      onSaveAndFeedback: () => undefined,
      onOpenFeedback: () => undefined,
      onPrevious: () => undefined,
      onNext: () => undefined,
    }),
  );
}

function item(answer: string | null): PracticeSession['items'][number] {
  return {
    id: 'item-1',
    sequence: 1,
    status: answer ? 'answered' : 'pending',
    answer,
    answeredAt: answer ? '2026-07-23T00:00:00.000Z' : null,
    evaluation: null,
    question: {
      id: 'question-1',
      tenantId: 'public',
      visibility: 'public',
      title: '如何制定稳定的缓存失效策略？',
      stem: '请说明你的判断、取舍与验证路径。',
      type: 'system_design',
      difficulty: 'medium',
      tags: ['缓存', '系统设计'],
      sourceRefs: [],
      status: 'published',
    },
  };
}
