import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { RequireAuth } from './RequireAuth';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

type MockAuthState = {
  status: 'loading' | 'authenticated';
  mode: 'local';
};

const authState = vi.hoisted(() => ({
  current: { status: 'loading', mode: 'local' } as MockAuthState,
}));

vi.mock('@interview-agent/auth-client', () => ({
  useAuth: () => authState.current,
}));

vi.mock('./FederatedAccessScreen', () => ({ FederatedAccessScreen: () => null }));
vi.mock('./LocalAccessScreen', () => ({ LocalAccessScreen: () => null }));

describe('首次登录过渡界面', () => {
  it('认证状态初始化时提供可见的品牌加载内容', () => {
    authState.current = { status: 'loading', mode: 'local' };

    const html = renderToStaticMarkup(
      <RequireAuth>
        <div>训练工作台</div>
      </RequireAuth>,
    );

    expect(html).toContain('role="status"');
    expect(html).toContain('OfferPilot');
    expect(html).toContain('正在确认登录状态');
    expect(html).toContain('正在恢复安全会话');
    expect(html).toContain('无需重复操作，完成后自动进入');
    expect(html).not.toContain('登录准备进度');
    expect(html).not.toContain('训练进度');
  });
});
