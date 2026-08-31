import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CandidateBatchReviewBar, type CandidateBatchAction } from './CandidateBatchReviewBar';

describe('CandidateBatchReviewBar', () => {
  it('shows batch actions with the selected source title', () => expectReviewActions());
  it('blocks submission when selections cross source files', () => expectSourceMismatch());
  it('shows a confirmed batch publish action only for approved selections', () =>
    expectPublishAction());
  it('spins only the acting button and merely disables the rest', () =>
    expectSingleLoadingAction());
});

function renderBar(input: {
  submittingAction: CandidateBatchAction | null;
  canSubmit: boolean;
  canPublish: boolean;
  sourceImport: { id: string; title: string } | null;
}) {
  return renderToStaticMarkup(
    createElement(CandidateBatchReviewBar, {
      submittingAction: input.submittingAction,
      notes: '',
      selection: {
        candidateIds: ['candidate-1', 'candidate-2'],
        canSubmit: input.canSubmit,
        canPublish: input.canPublish,
        sourceImport: input.sourceImport,
      },
      onNotesChange: () => undefined,
      onPublish: () => undefined,
      onReview: () => undefined,
    }),
  );
}

function expectReviewActions() {
  const markup = renderBar({
    submittingAction: null,
    canSubmit: true,
    canPublish: false,
    sourceImport: { id: 'import-1', title: 'Java 面试资料.md' },
  }).replace(/\s+/g, '');

  expect(markup).toContain('已选2题');
  expect(markup).toContain('Java面试资料.md');
  expect(markup).toContain('批量通过');
  expect(markup).toContain('批量需修改');
  expect(markup).toContain('批量驳回');
}

function expectSourceMismatch() {
  const markup = renderBar({
    submittingAction: null,
    canSubmit: false,
    canPublish: false,
    sourceImport: null,
  });

  expect(markup).toContain('请按来源文件分别审核。');
  expect(markup).not.toContain('批量通过');
}

function expectPublishAction() {
  const markup = renderBar({
    submittingAction: null,
    canSubmit: true,
    canPublish: true,
    sourceImport: { id: 'import-1', title: 'Java 面试资料.md' },
  });

  expect(markup).toContain('批量发布到题库');
  expect(markup).toContain('仅发布已通过的候选题');
}

function expectSingleLoadingAction() {
  const markup = renderBar({
    submittingAction: 'approved',
    canSubmit: true,
    canPublish: true,
    sourceImport: { id: 'import-1', title: 'Java 面试资料.md' },
  });
  const buttons = markup.split('<button').slice(1);
  const approve = buttons.find((button) => button.includes('批量通过'));
  const needsEdit = buttons.find((button) => button.includes('批量需修改'));
  const reject = buttons.find((button) => button.includes('批量驳回'));
  const publish = buttons.find((button) => button.includes('批量发布到题库'));

  expect(approve).toContain('ant-btn-loading');
  for (const other of [needsEdit, reject, publish]) {
    expect(other).toContain('disabled');
    expect(other).not.toContain('ant-btn-loading');
  }
}
