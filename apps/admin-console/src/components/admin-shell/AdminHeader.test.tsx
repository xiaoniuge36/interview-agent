import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@interview-agent/auth-client', () => ({
  useAuth: () => ({
    identity: { role: 'platform_admin' },
    mode: 'development',
  }),
}));

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const [{ AdminWorkspaceProvider }, { AdminHeader }] = await Promise.all([
  import('@/components/admin-workspace-context'),
  import('./AdminHeader'),
]);

describe('AdminHeader', () => {
  it('renders one command trigger instead of duplicate quick and search controls', () => {
    const markup = renderToStaticMarkup(
      createElement(
        AdminWorkspaceProvider,
        null,
        createElement(AdminHeader, {
          activeView: 'overview',
          collapsed: false,
          isRefreshing: false,
          lastUpdatedAt: '2026-07-23T07:17:50.000Z',
          onRefresh: vi.fn(),
          onToggleSidebar: vi.fn(),
          onViewChange: vi.fn(),
        }),
      ),
    );

    expect(markup).toContain('class="admin-header-actions"');
    expect(markup).toContain('role="toolbar"');
    expect(markup).toContain('aria-label="后台快捷操作"');
    expect(markup).toContain('class="admin-command-trigger');
    expect(markup).toContain('aria-label="搜索模块或命令"');
    expect(markup).toContain('Ctrl K');
    expect(markup).not.toContain('role="combobox"');
    expect(markup).not.toContain('搜索功能 / 模块');
    expect(markup).toContain('刷新');
  });
});
