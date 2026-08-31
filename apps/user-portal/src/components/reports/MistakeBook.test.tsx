import type { MistakeBook } from '@interview-agent/contracts';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime } from '@/lib/format';
import { MistakeBookContent, mistakeBookReviewHref } from './MistakeBook';

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

  it('pages through a long mistake list without hiding the total evidence', () => {
    const paged = { ...book(true), page: 2, pageSize: 8, total: 17, totalPages: 3 };

    const markup = renderToStaticMarkup(
      createElement(MistakeBookContent, {
        book: paged,
        startingId: null,
        onStart: () => undefined,
        onPage: () => undefined,
      }),
    );

    expect(markup).toContain('共 17 条 · 第 2 / 3 页');
    expect(markup).toContain('上一页');
    expect(markup).toContain('下一页');
  });

  it('keeps the pager out of static renders that cannot change pages', () => {
    expect(render(book(true))).not.toContain('上一页');
  });
});

describe('MistakeBookContent 时间与复练状态', () => {
  it('低分评价时间使用全站统一的日期时间格式', () => {
    const markup = render(book(true));

    expect(markup).toContain(`${formatDateTime('2026-07-29T08:00:00.000Z')} · 低分评价`);
  });

  it('已复练的可练题标注上次复练时间并说明可再次复练', () => {
    const markup = render(withReviewedAt(book(true), '2026-08-01T09:00:00.000Z'));

    expect(markup).toContain(`上次复练于 ${formatDate('2026-08-01T09:00:00.000Z')}（可再次复练）`);
  });

  it('已下架的已复练题不再声称可以再次复练', () => {
    const markup = render(withReviewedAt(book(false), '2026-08-01T09:00:00.000Z'));

    expect(markup).toContain(`上次复练于 ${formatDate('2026-08-01T09:00:00.000Z')}`);
    expect(markup).not.toContain('可再次复练');
  });
});

describe('MistakeBookContent priority sort', () => {
  it('offers the priority sort switch only when sorting is wired up', () => {
    const sortable = renderToStaticMarkup(
      createElement(MistakeBookContent, {
        book: book(true),
        startingId: null,
        onStart: () => undefined,
        sort: 'priority',
        onSortChange: () => undefined,
      }),
    );

    expect(sortable).toContain('优先复练');
    expect(sortable).toContain('最近错题');
    expect(sortable).toMatch(/aria-pressed="true"[^>]*>优先复练/);
    expect(render(book(true))).not.toContain('优先复练');
  });
});

describe('MistakeBookContent course recommendation', () => {
  it('turns low-score topic tags into a targeted course entry', () => {
    const reactMistake = {
      ...book(true).items[0]!,
      questionSnapshot: {
        ...book(true).items[0]!.questionSnapshot,
        tags: ['ReAct', '基础概念'],
      },
    };
    const markup = render({ ...book(true), items: [reactMistake] });

    expect(markup).toContain('针对性补课');
    expect(markup).toContain('去学《Agent 基础与上下文工程》');
    expect(markup).toContain(
      'href="/learn?doc=%E5%AD%A6%E4%B9%A0%E8%B7%AF%E7%BA%BF-01-agent%E5%9F%BA%E7%A1%80%E4%B8%8E%E4%B8%8A%E4%B8%8B%E6%96%87%E5%B7%A5%E7%A8%8B"',
    );
    expect(markup).toContain('1 道低分题命中 ReAct');
  });

  it('hides the course entry when no mistake maps to a learning course', () => {
    expect(render(book(true))).not.toContain('针对性补课');
  });
});

it('opens a created mistake review with the only permitted return origin', () => {
  expect(mistakeBookReviewHref('review-session')).toBe(
    '/practice?session=review-session&origin=mistake-book',
  );
});

it('makes the fixed return anchor focusable and announces the refreshed review state', () => {
  const markup = renderToStaticMarkup(
    createElement(MistakeBookContent, {
      book: book(true),
      startingId: null,
      onStart: () => undefined,
      returnedFromReview: true,
    } as unknown as React.ComponentProps<typeof MistakeBookContent>),
  );

  expect(markup).toContain('id="mistake-book-heading" tabindex="-1"');
  expect(markup).toContain('role="status"');
  expect(markup).toContain('已回到错题本，已刷新复练状态。');
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

function withReviewedAt(value: MistakeBook, reviewedAt: string): MistakeBook {
  return { ...value, items: value.items.map((item) => ({ ...item, reviewedAt })) };
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
