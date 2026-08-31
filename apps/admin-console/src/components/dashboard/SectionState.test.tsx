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

  it('surfaces the API failure with a retry entry instead of a fake empty state', () => {
    const markup = renderToStaticMarkup(
      createElement(SectionFeedback, {
        state: {
          status: 'error',
          error: new AdminApiError({ message: '服务暂时不可用', code: 'NETWORK_ERROR' }),
        },
        onRetry: () => undefined,
      }),
    );

    expect(markup).toContain('ant-alert');
    expect(markup).toContain('数据加载失败');
    expect(markup).toContain('服务暂时不可用');
    // antd 会在两个汉字的按钮文案中间补空格，先归一化再断言。
    expect(markup.replace(/\s+/g, '')).toContain('重试');
    expect(markup).not.toContain('暂无可展示数据');
  });

  it('still shows the raw error message when the section cannot be reloaded', () => {
    const markup = renderToStaticMarkup(
      createElement(SectionFeedback, {
        state: {
          status: 'error',
          error: new AdminApiError({ message: '服务暂时不可用', code: 'NETWORK_ERROR' }),
        },
      }),
    );

    expect(markup).toContain('服务暂时不可用');
    expect(markup.replace(/\s+/g, '')).not.toContain('重试');
  });

  it('uses a platform-specific permission message for global governance pages', () => {
    const markup = renderToStaticMarkup(
      createElement(SectionFeedback, {
        state: { status: 'forbidden', access: 'platform-only' },
      }),
    );

    expect(markup).toContain('仅平台管理员可见');
  });
});
