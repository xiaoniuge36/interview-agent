import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { WeaknessReviewButton } from './WeaknessReviewAction';

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
