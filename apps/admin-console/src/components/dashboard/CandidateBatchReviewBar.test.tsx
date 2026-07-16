import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CandidateBatchReviewBar } from './CandidateBatchReviewBar';

describe('CandidateBatchReviewBar', () => {
  it('shows batch actions with the selected source title', () => {
    const markup = renderToStaticMarkup(
      createElement(CandidateBatchReviewBar, {
        isSubmitting: false,
        notes: '',
        selection: {
          candidateIds: ['candidate-1', 'candidate-2'],
          canSubmit: true,
          sourceImport: { id: 'import-1', title: 'Java 面试资料.md' },
        },
        onNotesChange: () => undefined,
        onReview: () => undefined,
      }),
    ).replace(/\s+/g, '');

    expect(markup).toContain('已选2题');
    expect(markup).toContain('Java面试资料.md');
    expect(markup).toContain('批量通过');
    expect(markup).toContain('批量需修改');
    expect(markup).toContain('批量驳回');
  });

  it('blocks submission when selections cross source files', () => {
    const markup = renderToStaticMarkup(
      createElement(CandidateBatchReviewBar, {
        isSubmitting: false,
        notes: '',
        selection: { candidateIds: ['candidate-1', 'candidate-2'], canSubmit: false, sourceImport: null },
        onNotesChange: () => undefined,
        onReview: () => undefined,
      }),
    );

    expect(markup).toContain('请按来源文件分别审核。');
    expect(markup).not.toContain('批量通过');
  });
});
