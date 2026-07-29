import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { nextPracticeNavigationFocus, PracticeNavigationDialog } from './PracticeNavigationDialog';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

it('用明确动作解释未保存切题的结果', async () => {
  const markup = renderToStaticMarkup(
    createElement(PracticeNavigationDialog, {
      confirmation: {
        cancelLabel: '留在本题',
        confirmLabel: '保留草稿并切换',
        description: '当前修改只保存在这个标签页，切换后仍可回来继续编辑。',
        title: '保留这段草稿再切换？',
      },
      onCancel: () => undefined,
      onConfirm: () => undefined,
    }),
  );

  expect(markup).toContain('role="dialog"');
  expect(markup).toContain('aria-modal="true"');
  expect(markup).toContain('保留这段草稿再切换？');
  expect(markup).toContain('留在本题');
  expect(markup).toContain('保留草稿并切换');
});

it('在留在本题与保留草稿切换之间循环焦点', async () => {
  expect(nextPracticeNavigationFocus('cancel')).toBe('confirm');
  expect(nextPracticeNavigationFocus('confirm')).toBe('cancel');
});
