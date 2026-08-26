import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AdminSectionBoundary } from './AdminSectionBoundary';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('AdminSectionBoundary', () => {
  it('无错误时原样渲染子树', () => {
    const html = renderToStaticMarkup(
      <AdminSectionBoundary section="数据看板">
        <p>板块内容</p>
      </AdminSectionBoundary>,
    );

    expect(html).toContain('板块内容');
    expect(html).not.toContain('板块出错了');
  });

  it('捕获渲染错误后进入错误态', () => {
    expect(AdminSectionBoundary.getDerivedStateFromError()).toEqual({ hasError: true });
  });
});
