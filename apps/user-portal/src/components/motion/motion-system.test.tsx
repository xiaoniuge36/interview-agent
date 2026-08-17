import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PageMotion } from './PageMotion';

describe('页面动效基础设施', () => {
  it('保留页面内容和可定位的动效容器', () => {
    const markup = renderToStaticMarkup(
      <PageMotion>
        <h1>练习首页</h1>
      </PageMotion>,
    );

    expect(markup).toContain('route-motion-view');
    expect(markup).toContain('练习首页');
  });
});
