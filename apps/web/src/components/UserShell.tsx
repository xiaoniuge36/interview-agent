'use client';

import { useAuth } from '@interview-agent/auth-client';
import type { ReactNode } from 'react';

const NAV_ITEMS = [
  ['Workspace', '工作台', '#profile'],
  ['Profile', '画像', '#profile'],
  ['Job Intent', 'JD', '#profile'],
  ['Mock Interview', '模拟面试', '#interview'],
  ['Report Center', '报告', '#interview'],
] as const;

export function UserShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <h1>Interview Agent</h1>
          <p>Professional Identity Training</p>
        </div>
        <a className="button" href="#interview">
          新建模拟面试
        </a>
        <nav className="nav" aria-label="用户端主导航">
          {NAV_ITEMS.map(([en, zh, href]) => (
            <a
              key={en}
              className={'nav-item ' + (en === 'Mock Interview' ? 'active' : '')}
              href={href}
            >
              <span>{zh}</span>
              <small>{en}</small>
            </a>
          ))}
        </nav>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="search">Product API 契约驱动工作台</div>
          <IdentityActions auth={auth} />
        </header>
        {children}
      </main>
    </div>
  );
}

type AuthView = ReturnType<typeof useAuth>;

function IdentityActions({ auth }: { auth: AuthView }) {
  const identity = auth.identity;
  return (
    <div className="identity-actions">
      <div className="chip">
        <span className="status-dot" />
        {identity?.displayName ?? identity?.subject ?? 'authenticated'}
        {identity?.role ? ' · ' + identity.role : ''}
      </div>
      {auth.mode === 'oidc' ? (
        <button
          className="button secondary compact-button"
          type="button"
          onClick={() => void auth.signOut()}
        >
          退出登录
        </button>
      ) : null}
    </div>
  );
}
