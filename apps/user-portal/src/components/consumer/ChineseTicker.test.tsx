import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ChineseTicker } from './ChineseTicker';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('中文训练滚动字幕', () => {
  it('只使用中文训练概念并复制无障碍隐藏队列', () => {
    const markup = renderToStaticMarkup(<ChineseTicker />);

    for (const text of [
      '上下文工程',
      '检索增强生成',
      '工具调用',
      '智能体记忆',
      '面试证据',
      '训练复盘',
    ]) {
      expect(markup).toContain(text);
    }
    expect(markup).not.toContain('CONTEXT ENGINEERING');
    expect(markup).toContain('aria-hidden="true"');
  });
});
