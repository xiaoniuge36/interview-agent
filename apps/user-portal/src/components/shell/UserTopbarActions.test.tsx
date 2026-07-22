import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { UserTopbarActions } from './UserTopbarActions';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const authState = vi.hoisted(() => ({
  current: {
    identity: { displayName: 'Niu' },
    mode: 'local',
    signOut: vi.fn(),
  },
}));

vi.mock('@interview-agent/auth-client', () => ({
  useAuth: () => authState.current,
}));

const themeMenuState = vi.hoisted(() => ({ variant: '' }));

vi.mock('../theme/ThemeMenu', () => ({
  ThemeMenu: ({ variant }: { variant?: string }) => {
    themeMenuState.variant = variant ?? '';
    return <span>主题切换</span>;
  },
}));

describe('UserTopbarActions', () => {
  it('将主题、个人设置与退出操作放在顶部', () => {
    authState.current = {
      identity: { displayName: 'Niu' },
      mode: 'local',
      signOut: vi.fn(),
    };

    const markup = renderToStaticMarkup(<UserTopbarActions />);

    expect(markup).toContain('主题切换');
    expect(markup).toContain('个人设置');
    expect(markup).toContain('退出登录');
    expect(markup).toContain('N');
    expect(themeMenuState.variant).toBe('topbar');
  });

  it('开发模拟身份不展示退出操作', () => {
    authState.current = {
      identity: { displayName: 'Dev' },
      mode: 'development',
      signOut: vi.fn(),
    };

    const markup = renderToStaticMarkup(<UserTopbarActions />);

    expect(markup).not.toContain('退出登录');
  });
});
