import type { QuestionCatalogResponse } from '@interview-agent/contracts';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { QuestionCatalogList } from './QuestionCatalogList';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('QuestionCatalogList', () => {
  it('首次加载失败时展示整块错误态与重新加载', () => {
    const markup = renderList({ catalog: null, error: '当前筛选结果没有加载成功。' });

    expect(markup).toContain('题库加载中断');
    expect(markup).toContain('重新加载');
  });

  it('翻页或改筛选失败时保留旧列表并置顶错误条与重试', () => {
    const markup = renderList({
      catalog: catalog(),
      error: '当前筛选结果没有加载成功，请保留题单后重试。',
    });

    expect(markup).toContain('question-catalog-refresh-error');
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('下方仍是上一次的结果');
    expect(markup).toContain('重试');
    expect(markup).toContain('如何设计稳定的缓存失效策略？');
  });

  it('刷新期间用 aria-busy 标记结果区并提示正在更新', () => {
    const markup = renderList({ catalog: catalog(), loading: true });

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('正在更新结果…');
    expect(markup).not.toContain('question-catalog-refresh-error');
  });
});

function renderList({
  catalog = null,
  loading = false,
  error = '',
}: {
  catalog?: QuestionCatalogResponse | null;
  loading?: boolean;
  error?: string;
}) {
  return renderToStaticMarkup(
    createElement(QuestionCatalogList, {
      catalog,
      loading,
      error,
      selectedIds: [],
      onToggle: () => undefined,
      onRetry: () => undefined,
      onPage: () => undefined,
    }),
  );
}

function catalog(): QuestionCatalogResponse {
  return {
    items: [
      {
        id: 'question-1',
        tenantId: 'public',
        visibility: 'public',
        title: '如何设计稳定的缓存失效策略？',
        stem: '请说明你的判断、取舍与验证路径。',
        type: 'system_design',
        difficulty: 'medium',
        tags: ['缓存'],
        companies: [],
        sourceRefs: [],
        status: 'published',
      },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    facets: { tags: [], companies: [] },
  } as unknown as QuestionCatalogResponse;
}
