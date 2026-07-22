import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CandidateBatchReviewBar } from './CandidateBatchReviewBar';

describe('CandidateBatchReviewBar', () => {
  it('shows batch actions with the selected source title', () => expectReviewActions());
  it('blocks submission when selections cross source files', () => expectSourceMismatch());
  it('shows a confirmed batch publish action only for approved selections', () =>
    expectPublishAction());
});

function expectReviewActions() {
  const markup = renderToStaticMarkup(
    createElement(CandidateBatchReviewBar, {
      isSubmitting: false,
      notes: '',
      selection: {
        candidateIds: ['candidate-1', 'candidate-2'],
        canSubmit: true,
        canPublish: false,
        sourceImport: { id: 'import-1', title: 'Java 面试资料.md' },
      },
      onNotesChange: () => undefined,
      onPublish: () => undefined,
      onReview: () => undefined,
    }),
  ).replace(/\s+/g, '');

  expect(markup).toContain('已选2题');
  expect(markup).toContain('Java面试资料.md');
  expect(markup).toContain('批量通过');
  expect(markup).toContain('批量需修改');
  expect(markup).toContain('批量驳回');
}

function expectSourceMismatch() {
  const markup = renderToStaticMarkup(
    createElement(CandidateBatchReviewBar, {
      isSubmitting: false,
      notes: '',
      selection: {
        candidateIds: ['candidate-1', 'candidate-2'],
        canSubmit: false,
        canPublish: false,
        sourceImport: null,
      },
      onNotesChange: () => undefined,
      onPublish: () => undefined,
      onReview: () => undefined,
    }),
  );

  expect(markup).toContain('请按来源文件分别审核。');
  expect(markup).not.toContain('批量通过');
}

function expectPublishAction() {
  const BatchReviewBar = CandidateBatchReviewBar as unknown as (props: {
    isSubmitting: boolean;
    notes: string;
    selection: {
      candidateIds: string[];
      canSubmit: boolean;
      canPublish: boolean;
      sourceImport: { id: string; title: string } | null;
    };
    onNotesChange: (notes: string) => void;
    onPublish: () => void;
    onReview: () => void;
  }) => ReactNode;
  const markup = renderToStaticMarkup(
    createElement(BatchReviewBar, {
      isSubmitting: false,
      notes: '',
      selection: {
        candidateIds: ['candidate-1', 'candidate-2'],
        canSubmit: true,
        canPublish: true,
        sourceImport: { id: 'import-1', title: 'Java 面试资料.md' },
      },
      onNotesChange: () => undefined,
      onPublish: () => undefined,
      onReview: () => undefined,
    }),
  );

  expect(markup).toContain('批量发布到题库');
  expect(markup).toContain('仅发布已通过的候选题');
}
