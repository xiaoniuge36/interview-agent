import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AccessStory } from './AccessStory';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('AccessStory', () => {
  it('frames sign-in around verifiable product facts and the training loop', () => {
    const markup = renderToStaticMarkup(<AccessStory />);

    expect(markup).toContain('下一次面试');
    expect(markup).toContain('192+');
    expect(markup).toContain('表达力逐题评价');
    expect(markup).toContain('建档案');
    expect(markup).toContain('复盘沉淀');
    expect(markup).toContain('href="#access-panel"');
    expect(markup).toContain('href="/"');
  });

  it('shows a clearly-labeled product example instead of fabricated personal progress', () => {
    const markup = renderToStaticMarkup(<AccessStory />);

    expect(markup).toContain('产品示例');
    expect(markup).toContain('追问：');
    expect(markup).toContain('86 / 100');
    expect(markup).not.toContain('根据上次模拟面试');
    expect(markup).not.toContain('class="complete"');
  });

  it('answers pre-signup questions about model setup, coverage and data usage', () => {
    const markup = renderToStaticMarkup(<AccessStory />);

    expect(markup).toContain('需要自己配置 AI 模型吗？');
    expect(markup).toContain('覆盖哪些岗位方向？');
    expect(markup).toContain('我的训练数据会被怎么使用？');
    expect(markup).toContain('工程研发、数据与 AI、产品与设计、增长与运营、市场与商业、项目与交付');
  });
});
