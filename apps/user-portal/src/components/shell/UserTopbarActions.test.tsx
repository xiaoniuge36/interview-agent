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

const navigationState = vi.hoisted(() => ({ pathname: '/home' }));

vi.mock('next/navigation', () => ({
  usePathname: () => navigationState.pathname,
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
    navigationState.pathname = '/profile';
    authState.current = {
      identity: { displayName: 'Niu' },
      mode: 'local',
      signOut: vi.fn(),
    };

    const markup = renderToStaticMarkup(<UserTopbarActions />);

    expect(markup).toContain('主题切换');
    expect(markup).toContain('Agent 档案');
    expect(markup).toContain('href="/profile"');
    expect(markup).toContain('user-topbar-account active');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain('href="/settings"');
    expect(markup).toContain('打开设置');
    expect(markup).toContain('退出登录');
    expect(markup).toContain('N');
    expect(themeMenuState.variant).toBe('topbar');
  });

  it('开发模拟身份不展示退出操作', () => {
    navigationState.pathname = '/home';
    authState.current = {
      identity: { displayName: 'Dev' },
      mode: 'development',
      signOut: vi.fn(),
    };

    const markup = renderToStaticMarkup(<UserTopbarActions />);

    expect(markup).not.toContain('退出登录');
  });

  it('marks settings as the current topbar destination', () => {
    navigationState.pathname = '/settings';

    const markup = renderToStaticMarkup(<UserTopbarActions />);

    expect(markup).toContain('user-topbar-settings active');
    expect(markup.match(/aria-current="page"/g)).toHaveLength(1);
  });
});
