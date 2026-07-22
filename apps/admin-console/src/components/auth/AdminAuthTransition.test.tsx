import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AdminAuthTransition } from './AdminAuthTransition';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('AdminAuthTransition', () => {
  it('在认证恢复时提供可访问的后台登录状态', () => {
    const html = renderToStaticMarkup(<AdminAuthTransition />);

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('正在验证后台登录状态');
    expect(html).toContain('正在恢复安全会话');
  });
});
