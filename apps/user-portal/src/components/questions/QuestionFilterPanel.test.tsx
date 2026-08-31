import {
  QuestionCatalogQuerySchema,
  type QuestionCatalogResponse,
} from '@interview-agent/contracts';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { QuestionFilterPanel } from './QuestionFilterPanel';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('QuestionFilterPanel', () => {
  it('筛选 chip 是 toggle 语义按钮，用 aria-pressed 暴露选中态', () => {
    const markup = renderPanel({ tags: 'agent' });

    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('aria-pressed="false"');
  });

  it('未选择任何标签时「全部」chip 处于按下态', () => {
    const markup = renderPanel();
    const allTagChip = markup.slice(markup.indexOf('全部标签') - 200, markup.indexOf('全部标签'));

    expect(allTagChip).toContain('aria-pressed="true"');
  });
});

function renderPanel(queryOverrides: Record<string, string> = {}) {
  return renderToStaticMarkup(
    createElement(QuestionFilterPanel, {
      query: QuestionCatalogQuerySchema.parse(queryOverrides),
      facets: facets(),
      onChange: () => undefined,
    }),
  );
}

function facets(): QuestionCatalogResponse['facets'] {
  return {
    categories: [],
    difficulties: [],
    types: [],
    tags: [
      { value: 'agent', label: 'Agent 设计', count: 12 },
      { value: 'rag', label: 'RAG', count: 6 },
    ],
    companies: [{ value: 'acme', label: 'Acme', count: 3 }],
  };
}
