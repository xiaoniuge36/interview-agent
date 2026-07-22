import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AdminAccess, canAccessConsole } from './AdminAccess';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const authState = vi.hoisted(() => ({
  current: { mode: 'local', status: 'loading' },
}));

vi.mock('@interview-agent/auth-client', () => ({
  useAuth: () => authState.current,
}));

describe('canAccessConsole', () => {
  it('allows every backend governance role', () => {
    expect(canAccessConsole('admin')).toBe(true);
    expect(canAccessConsole('question_reviewer')).toBe(true);
    expect(canAccessConsole('platform_admin')).toBe(true);
  });

  it('denies regular and missing roles', () => {
    expect(canAccessConsole('candidate')).toBe(false);
    expect(canAccessConsole('user')).toBe(false);
    expect(canAccessConsole(undefined)).toBe(false);
  });
});

describe('AdminAccess', () => {
  it('在会话恢复期间渲染可见的过渡状态', () => {
    authState.current = { mode: 'local', status: 'loading' };

    const html = renderToStaticMarkup(
      React.createElement(AdminAccess, null, React.createElement('div', null, '治理控制台')),
    );

    expect(html).toContain('正在验证后台登录状态');
    expect(html).not.toContain('治理控制台');
  });
});
