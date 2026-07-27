import React, { createElement } from 'react';
import { App } from 'antd';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { AdminPagedListController } from '@/hooks/useAdminPagedList';
import { CandidateQueueTable } from './CandidateQueueTable';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const list = {
  reload: () => undefined,
  submittedQuery: {},
} as unknown as AdminPagedListController<'candidates'>;

const candidate = {
  id: 'candidate-1',
  importTaskId: 'import-1',
  sourceImport: { id: 'import-1', title: '架构设计资料' },
  title: '解释缓存穿透',
  status: 'approved' as const,
  qualityScore: 88,
  tags: ['缓存'],
  sourceRefs: ['source-1'],
  createdAt: '2026-07-15T00:00:00.000Z',
};

describe('CandidateQueueTable', () => {
  it('marks whether each approved candidate has already been published to the question bank', () => {
    const markup = renderToStaticMarkup(
      createElement(
        App,
        null,
        createElement(CandidateQueueTable, {
          candidates: [
            { ...candidate, publishedQuestionId: 'question-1' },
            { ...candidate, id: 'candidate-2', publishedQuestionId: null },
          ],
          list,
          onChanged: () => undefined,
          onReview: () => undefined,
        }),
      ),
    );

    expect(markup).toContain('已发布题库');
    expect(markup).toContain('尚未发布');
  });
});
