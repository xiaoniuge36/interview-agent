import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { WeaknessEvidenceSummary, WeaknessReviewButton } from './WeaknessReviewAction';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

it('disables the action and explains progress while a session is being created', () => {
  const markup = renderToStaticMarkup(
    createElement(WeaknessReviewButton, {
      starting: true,
      onStart: () => undefined,
    }),
  );

  expect(markup).toContain('disabled=""');
  expect(markup).toContain('正在组题…');
});

it('names the available action by the user outcome', () => {
  const markup = renderToStaticMarkup(
    createElement(WeaknessReviewButton, {
      starting: false,
      onStart: () => undefined,
    }),
  );

  expect(markup).toContain('复练薄弱项');
});

it('explains evidence, question count, and estimated time without calculating them', () => {
  const markup = renderToStaticMarkup(
    createElement(WeaknessEvidenceSummary, {
      evidence: ['低分评价', '能力记忆'],
      questionCount: 5,
      estimatedMinutes: 20,
    }),
  );

  expect(markup).toContain('推荐依据');
  expect(markup).toContain('低分评价 · 能力记忆');
  expect(markup).toContain('5 题 · 约 20 分钟');
});
