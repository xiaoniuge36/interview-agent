import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AccessStory } from './AccessStory';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('AccessStory', () => {
  it('frames sign-in around the next useful training action', () => {
    const markup = renderToStaticMarkup(<AccessStory />);

    expect(markup).toContain('下一次面试');
    expect(markup).toContain('今天的下一步');
    expect(markup).toContain('每周训练节奏');
    expect(markup).toContain('href="#access-panel"');
    expect(markup).toContain('href="/"');
  });

  it('does not present fabricated personal progress before sign-in', () => {
    const markup = renderToStaticMarkup(<AccessStory />);

    expect(markup).toContain('登录后继续');
    expect(markup).toContain('登录后展示本周真实训练记录');
    expect(markup).not.toContain('根据上次模拟面试');
    expect(markup).not.toContain('class="complete"');
  });
});
