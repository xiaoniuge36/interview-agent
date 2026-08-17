import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ThemeMenuPopover } from './ThemeMenu';
import { ThemeAtmosphere } from './ThemeAtmosphere';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('六主题菜单', () => {
  it('渲染六套中文主题并移除独立强调色', () => {
    const markup = renderToStaticMarkup(
      <ThemeMenuPopover
        preferences={{ theme: 'daylight', motion: true }}
        setTheme={vi.fn()}
        setMotion={vi.fn()}
      />,
    );

    for (const label of [
      '极光叙事',
      '终端工业',
      '结构主义印刷',
      '白昼编辑部',
      '雾光玻璃',
      '彩色训练场',
    ]) {
      expect(markup).toContain(label);
    }
    expect(markup).not.toContain('主题色');
    expect(markup).toContain('界面动态效果');
  });

  it('环境层不拦截业务内容并保持装饰语义', () => {
    const markup = renderToStaticMarkup(<ThemeAtmosphere context="shell" />);

    expect(markup).toContain('theme-atmosphere-shell');
    expect(markup).toContain('aria-hidden="true"');
  });
});
