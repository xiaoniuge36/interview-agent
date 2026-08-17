import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '@interview-agent/auth-client';
import { ThemePreferencesProvider } from '@/components/theme/ThemePreferencesProvider';
import { AccessThemeMenu } from './AccessThemeMenu';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('登录页主题入口', () => {
  it('在登录前提供可访问的主题切换按钮', () => {
    const markup = renderToStaticMarkup(
      <AuthProvider client={authClient as never}>
        <ThemePreferencesProvider>
          <AccessThemeMenu />
        </ThemePreferencesProvider>
      </AuthProvider>,
    );

    expect(markup).toContain('theme-menu-floating');
    expect(markup).toContain('aria-label="切换外观主题"');
  });
});

const authClient = {
  mode: 'local',
  bootstrapState: () => ({ status: 'unauthenticated', identity: null, error: null }),
  initialize: async () => ({ status: 'unauthenticated', identity: null, error: null }),
  subscribe: () => () => undefined,
  getRequestHeaders: async () => new Headers(),
  signIn: async () => undefined,
  signInWithPassword: async () => undefined,
  register: async () => undefined,
  signOut: async () => undefined,
  completeSignIn: async () => ({ status: 'unauthenticated', identity: null, error: null }),
};
