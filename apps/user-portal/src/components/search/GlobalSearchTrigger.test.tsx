import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GlobalSearchTriggerView } from './GlobalSearchTrigger';

describe('全站顶部搜索入口', () => {
  it('提供可访问的公共搜索按钮与搜索范围提示', () => {
    const html = renderToStaticMarkup(
      <GlobalSearchTriggerView isOpen={false} onOpen={() => undefined} />,
    );

    expect(html).toContain('aria-label="打开全局搜索"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('搜索题目、题库专题或功能页面');
    expect(html).toContain('题目 · 专题 · 页面');
    expect(html).toContain('Ctrl K');
  });
});
