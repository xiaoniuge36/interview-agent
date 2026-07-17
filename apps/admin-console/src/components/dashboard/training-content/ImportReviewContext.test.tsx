import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ImportReviewContext as ReviewContext } from '@interview-agent/contracts';
import { BatchSourceOverview, CandidateSourceEvidence, SourceChunks } from './ImportReviewContext';

const context = {
  task: {
    id: 'import-1',
    tenantId: 'tenant-1',
    assetId: 'asset-1',
    title: 'Agent 常见问题资料',
    status: 'review',
    candidateCount: 8,
    candidateReviewProgress: {
      pending: 8,
      needsEdit: 0,
      approved: 0,
      rejected: 0,
      published: 0,
    },
    failureReason: null,
    createdAt: '2026-07-17T00:00:00.000Z',
    updatedAt: '2026-07-17T00:00:00.000Z',
  },
  sourceChunks: [
    { sequence: 1, content: '第一段原文' },
    { sequence: 2, content: '第二段原文' },
  ],
} satisfies ReviewContext;

describe('SourceChunks', () => {
  it('shows the source paragraph purpose and preview before opening the full text', () => {
    const markup = renderToStaticMarkup(
      createElement(SourceChunks, {
        chunks: [
          { sequence: 1, content: '从学习笔记中整理出依赖注入的面试复习要点。' },
          { sequence: 2, content: '补充说明常见的实现方式与适用边界。' },
        ],
      }),
    );

    expect(markup).toContain('资料段落 1 / 2');
    expect(markup).toContain('从学习笔记中整理出依赖注入的面试复习要点。');
    expect(markup).toContain('完整原文');
    expect(markup).not.toContain('原文片段 1');
  });
});

describe('import review context hierarchy', () => {
  it('keeps the workbench focused on the import batch instead of duplicating all source paragraphs', () => {
    const markup = renderToStaticMarkup(createElement(BatchSourceOverview, { context }));

    expect(markup).toContain('打开任意候选题后，会自动定位到对应的原文依据。');
    expect(markup).toContain('原文已拆分为 2 个段落');
    expect(markup).not.toContain('资料段落 1 / 2');
  });

  it('shows only the source paragraph referenced by the candidate inside the review drawer', () => {
    const markup = renderToStaticMarkup(
      createElement(CandidateSourceEvidence, {
        context,
        sourceRefs: ['knowledge://asset/asset-1/chunk/2'],
      }),
    );

    expect(markup).toContain('本题原文依据');
    expect(markup).toContain('资料段落 2');
    expect(markup).not.toContain('资料段落 1');
  });
});
