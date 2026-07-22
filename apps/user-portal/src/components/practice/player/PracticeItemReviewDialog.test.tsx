import type { PracticeItemSolution, PracticeSession } from '@interview-agent/contracts';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PracticeItemReviewDialog } from './PracticeItemReviewDialog';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const item = {
  id: 'item-1',
  sequence: 1,
  status: 'evaluated',
  answer: 'My answer',
  answeredAt: '2026-07-22T09:00:00.000Z',
  question: {
    id: 'question-1',
    tenantId: 'tenant-1',
    visibility: 'public',
    title: 'Explain prompt injection defense',
    stem: 'Explain the safeguards you would use.',
    type: 'short_answer',
    difficulty: 'medium',
    tags: ['agent-safety'],
    sourceRefs: [],
    status: 'published',
  },
  evaluation: {
    id: 'evaluation-1',
    sessionItemId: 'item-1',
    score: 86,
    feedback: 'Strong layered defense explanation.',
    missingPoints: ['Include human approval'],
    rubricScores: [{ point: 'Validation', score: 90 }],
    followUpQuestion: 'How do you audit exceptions?',
    createdAt: '2026-07-22T09:02:00.000Z',
  },
} satisfies PracticeSession['items'][number];

const solution = {
  referenceAnswer: 'Validate inputs before invoking tools.',
  rubric: [{ point: 'Validation', score: 10, description: 'Describes the boundary.' }],
} satisfies PracticeItemSolution;

describe('PracticeItemReviewDialog', () => {
  it('shows a wide review with answer, solution, and AI feedback', () => {
    const markup = renderToStaticMarkup(
      createElement(PracticeItemReviewDialog, {
        open: true,
        item,
        draft: item.answer,
        solution,
        onClose: vi.fn(),
      }),
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('本题复盘');
    expect(markup).toContain('我的回答');
    expect(markup).toContain('标准解析');
    expect(markup).toContain('AI 评价');
    expect(markup).toContain('Include human approval');
  });

  it('does not render while closed', () => {
    const markup = renderToStaticMarkup(
      createElement(PracticeItemReviewDialog, {
        open: false,
        item,
        draft: item.answer,
        solution,
        onClose: vi.fn(),
      }),
    );

    expect(markup).toBe('');
  });
});
