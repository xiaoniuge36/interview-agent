import React, { createElement } from 'react';
import { App } from 'antd';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { AdminPagedListController } from '@/hooks/useAdminPagedList';
import { formatAdminDateTime } from '@/lib/format';
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

type QueueCandidates = Parameters<typeof CandidateQueueTable>[0]['candidates'];

function renderQueue(candidates: QueueCandidates): string {
  return renderToStaticMarkup(
    createElement(
      App,
      null,
      createElement(CandidateQueueTable, {
        candidates,
        list,
        onChanged: () => undefined,
        onReview: () => undefined,
      }),
    ),
  );
}

describe('CandidateQueueTable', () => {
  it('marks whether each approved candidate has already been published to the question bank', () => {
    const markup = renderQueue([
      { ...candidate, publishedQuestionId: 'question-1' },
      { ...candidate, id: 'candidate-2', publishedQuestionId: null },
    ]);

    expect(markup).toContain('已发布题库');
    expect(markup).toContain('尚未发布');
  });

  it('renders creation time with the unified zh-CN date time format', () => {
    const markup = renderQueue([{ ...candidate, publishedQuestionId: null }]);

    expect(markup).toContain(formatAdminDateTime(candidate.createdAt));
  });

  it('offers a direct entry to the import center when the queue is empty', () => {
    const markup = renderQueue([]);

    expect(markup).toContain('没有匹配的候选题，可前往资料导入创建新任务。');
    expect(markup).toContain('前往资料导入');
    expect(markup).toContain('href="#imports"');
  });
});
