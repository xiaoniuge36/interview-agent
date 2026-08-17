import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StaggeredTitle } from './StaggeredTitle';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('中文短语标题', () => {
  it('保留完整可访问名称并按短语分段', () => {
    const markup = renderToStaticMarkup(
      <StaggeredTitle segments={['今天，', '只练', '最有价值的', '一题。']} />,
    );

    expect(markup).toContain('aria-label="今天，只练最有价值的一题。"');
    expect(markup.match(/staggered-title-segment/g)).toHaveLength(4);
  });
});
