import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ArchiveEmpty } from './ArchiveStates';
import type { TrainingRecordFilter } from './training-records-model';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

function render(filter: TrainingRecordFilter, query: string) {
  return renderToStaticMarkup(
    createElement(ArchiveEmpty, { filter, query, onClearQuery: () => undefined }),
  );
}

describe('ArchiveEmpty', () => {
  it('搜索无结果时优先提供清除关键词，训练入口退为次按钮', () => {
    const markup = render('all', 'RAG 检索');

    expect(markup).toContain('没有找到包含“RAG 检索”的训练记录');
    expect(markup).toContain('清除关键词');
    expect(markup.indexOf('清除关键词')).toBeLessThan(markup.indexOf('去选择题目'));
    expect(markup).toContain('button secondary');
  });

  it('非搜索空态保持训练入口为主按钮', () => {
    const markup = render('interview', '');

    expect(markup).not.toContain('清除关键词');
    expect(markup).toContain('开始模拟面试');
    expect(markup).toContain('href="/interview"');
    expect(markup).not.toContain('button secondary');
  });

  it('未接清除回调时不渲染无效按钮', () => {
    const markup = renderToStaticMarkup(
      createElement(ArchiveEmpty, { filter: 'all', query: 'RAG' }),
    );

    expect(markup).not.toContain('清除关键词');
  });
});
