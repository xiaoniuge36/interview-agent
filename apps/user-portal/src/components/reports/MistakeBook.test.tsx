import type { MistakeBook } from '@interview-agent/contracts';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MistakeBookContent } from './MistakeBook';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('MistakeBookContent', () => {
  it('turns an empty history into a directed next step', () => {
    const markup = render(emptyBook());

    expect(markup).toContain('还没有需要复练的错题');
    expect(markup).toContain('去自主选题');
  });

  it('shows evidence and keeps a disabled historical question readable', () => {
    const markup = render(book(false));

    expect(markup).toContain('Agent orchestration');
    expect(markup).toContain('推荐依据');
    expect(markup).toContain('orchestration');
    expect(markup).toContain('题目已下架，仅保留历史回看');
    expect(markup).not.toContain('开始这题复练');
  });

  it('shows the server-owned review action for a published mistake', () => {
    const markup = render(book(true));

    expect(markup).toContain('1 题 · 约 8 分钟');
    expect(markup).toContain('开始这题复练');
  });
});

function render(value: MistakeBook) {
  return renderToStaticMarkup(
    createElement(MistakeBookContent, {
      book: value,
      startingId: null,
      onStart: () => undefined,
    }),
  );
}

function emptyBook(): MistakeBook {
  return { items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 };
}

function book(canStartReview: boolean): MistakeBook {
  return {
    items: [
      {
        id: 'evaluation-1',
        practiceItemId: 'item-1',
        questionSnapshot: {
          id: 'question-1',
          title: 'Agent orchestration',
          stem: 'Compare orchestration strategies.',
          type: 'short_answer',
          difficulty: 'medium',
          tags: ['orchestration'],
          options: [],
        },
        score: 42,
        feedback: 'Missing recovery trade-offs.',
        missingPoints: ['State recovery'],
        evidence: [
          {
            tag: 'orchestration',
            evidence: '本轮练习包含 1 条评价证据。',
            observedScore: 42,
            createdAt: '2026-07-29T08:00:00.000Z',
          },
        ],
        evaluatedAt: '2026-07-29T08:00:00.000Z',
        reviewedAt: null,
        canStartReview,
      },
    ],
    page: 1,
    pageSize: 20,
    total: 1,
    totalPages: 1,
  };
}
