import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AdminApiError } from '@/lib/api';
import { SectionFeedback } from './SectionState';

describe('SectionFeedback', () => {
  it('centers the loading indicator in a full-width status region', () => {
    const markup = renderToStaticMarkup(
      createElement(SectionFeedback, {
        state: { status: 'loading' },
        loadingMessage: '正在查询',
      }),
    );

    expect(markup).toContain('admin-section-loading');
    expect(markup).toContain('admin-section-spin');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('正在查询');
  });

  it('keeps API failures out of the page and reserves the surface for a normal empty state', () => {
    const markup = renderToStaticMarkup(
      createElement(SectionFeedback, {
        state: {
          status: 'error',
          error: new AdminApiError({ message: '服务暂时不可用', code: 'NETWORK_ERROR' }),
        },
      }),
    );

    expect(markup).toContain('admin-section-empty');
    expect(markup).not.toContain('ant-alert');
    expect(markup).not.toContain('服务暂时不可用');
  });
});
