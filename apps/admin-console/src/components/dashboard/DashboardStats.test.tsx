import type { Dashboard } from '@interview-agent/contracts';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AdminApiError } from '@/lib/api';
import { DashboardStats } from './DashboardStats';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const dashboard = {
  stats: {
    publishedQuestions: 12,
    pendingCandidates: 4,
    activeInterviews: 2,
    reportsReady: 8,
    schemaPassRate: 92,
    avgLatencyMs: 320.4,
  },
} as Dashboard;

describe('DashboardStats', () => {
  it('labels every governance stat in Chinese', () => {
    const markup = renderToStaticMarkup(
      createElement(DashboardStats, { state: { status: 'ready', data: dashboard } }),
    );

    expect(markup).toContain('结构校验通过率');
    expect(markup).not.toContain('Schema 通过率');
  });

  it('shows the load failure with a retry entry instead of an empty state', () => {
    const markup = renderToStaticMarkup(
      createElement(DashboardStats, {
        state: {
          status: 'error',
          error: new AdminApiError({ message: '治理指标加载失败。', code: 'DASHBOARD_ERROR' }),
        },
        onRetry: () => undefined,
      }),
    );

    expect(markup).toContain('治理指标加载失败。');
    // antd 会在两个汉字的按钮文案中间补空格，先归一化再断言。
    expect(markup.replace(/\s+/g, '')).toContain('重试');
    expect(markup).not.toContain('暂无可展示数据');
  });
});
