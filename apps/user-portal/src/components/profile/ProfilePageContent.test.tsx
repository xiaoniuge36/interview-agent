import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const MODULE_IMPORT_TIMEOUT_MS = 10_000;

it('keeps the page intro explanatory without a competing next-step link', async () => {
  const { ProfilePageIntro } = await import('./ProfilePageContent');
  const markup = renderToStaticMarkup(createElement(ProfilePageIntro));

  expect(markup).toContain('让下一轮训练更贴近你');
  expect(markup).not.toContain('href="/job"');
}, MODULE_IMPORT_TIMEOUT_MS);
