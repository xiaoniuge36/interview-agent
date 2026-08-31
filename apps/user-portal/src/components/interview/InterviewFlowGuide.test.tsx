import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { InterviewFlowGuide } from './InterviewFlowGuide';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

it('promises only what leaving mid-interview actually preserves', () => {
  const markup = renderToStaticMarkup(createElement(InterviewFlowGuide));

  expect(markup).toContain('已提交的回答会实时保存');
  expect(markup).toContain('继续上次面试');
  expect(markup).toContain('未提交的草稿只保留在当前标签页');
  expect(markup).not.toContain('无损恢复');
});
