import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { InterviewReviewEvidenceDelivery } from './InterviewReviewEvidenceNotice';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

it('keeps loading, missing, and error states explicit and recoverable', () => {
  const loading = renderToStaticMarkup(
    createElement(InterviewReviewEvidenceDelivery, {
      state: { status: 'loading' },
      practiceSessionId: 'practice-review-1',
      onRetry: () => undefined,
    }),
  );
  const missing = renderToStaticMarkup(
    createElement(InterviewReviewEvidenceDelivery, {
      state: { status: 'missing' },
      practiceSessionId: 'practice-review-1',
      onRetry: () => undefined,
    }),
  );
  const error = renderToStaticMarkup(
    createElement(InterviewReviewEvidenceDelivery, {
      state: { status: 'error' },
      practiceSessionId: 'practice-review-1',
      onRetry: () => undefined,
    }),
  );

  expect(loading).toContain('正在读取本次专项复练证据');
  expect(missing).toContain('没有找到与来源报告匹配的复练证据');
  expect(missing).toContain('/practice?session=practice-review-1');
  expect(error).toContain('本次复练证据暂时无法读取');
  expect(error).toContain('重新读取');
});

it('shows the completed practice evidence and a route back to that practice', () => {
  const markup = renderToStaticMarkup(
    createElement(InterviewReviewEvidenceDelivery, {
      state: {
        status: 'ready',
        evidence: {
          practiceSessionId: 'practice-review-1',
          score: 76,
          weaknesses: ['恢复验证'],
          nextActions: ['补充故障演练'],
        },
      },
      practiceSessionId: 'practice-review-1',
      onRetry: () => undefined,
    }),
  );

  expect(markup).toContain('专项复练已完成');
  expect(markup).toContain('76');
  expect(markup).toContain('恢复验证');
  expect(markup).toContain('补充故障演练');
  expect(markup).toContain('/practice?session=practice-review-1');
  expect(markup).toContain('tabindex="-1"');
});
