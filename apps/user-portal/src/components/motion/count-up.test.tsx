import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CountUp } from './CountUp';

describe('数字滚动组件', () => {
  it('SSR 直接输出最终值，且为屏幕阅读器保留完整数值', () => {
    const markup = renderToStaticMarkup(<CountUp value={128} />);

    expect(markup).toContain('128');
    expect(markup).toContain('sr-only');
  });

  it('支持自定义格式化', () => {
    const markup = renderToStaticMarkup(<CountUp value={90} format={(v) => `${v} 分`} />);

    expect(markup).toContain('90 分');
  });
});
