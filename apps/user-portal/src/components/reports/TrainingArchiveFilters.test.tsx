import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { TrainingArchiveFilters } from './TrainingArchiveFilters';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('TrainingArchiveFilters', () => {
  it('offers a visible search field beside the record filters', () => {
    const markup = renderFilters('');

    expect(markup).toContain('placeholder="搜索标题、类型、状态或薄弱项"');
    expect(markup).toContain('<svg');
    expect(markup).not.toContain('清除搜索条件');
  });

  it('shows a clear control when a search condition is active', () => {
    const markup = renderFilters('系统设计');

    expect(markup).toContain('aria-label="清除搜索条件"');
  });
});

function renderFilters(query: string) {
  return renderToStaticMarkup(
    createElement(TrainingArchiveFilters, {
      filter: 'all',
      query,
      onChange: vi.fn(),
      onQueryChange: vi.fn(),
    }),
  );
}
