'use client';

import { useAuth } from '@interview-agent/auth-client';
import type { ReactNode } from 'react';

const NAV_ITEMS = [
  ['总览', '#section-0'],
  ['来源导入', '#section-1'],
  ['题库审核', '#section-2'],
  ['模型治理', '#section-3'],
  ['运行观测', '#section-4'],
  ['审计日志', '#section-5'],
] as const;

type AdminShellProps = {
  children: ReactNode;
  isRefreshing: boolean;
  onRefresh: () => void;
};

export function AdminShell(props: AdminShellProps) {
  return (
    <div className="console-shell">
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <aside className="console-sidebar">
        <div className="brand-block">
          <span>Interview Agent</span>
          <strong>Governance Console</strong>
        </div>
        <nav className="console-nav" aria-label="治理后台主导航">
          {NAV_ITEMS.map(([label, href]) => (
            <a href={href} key={href}>
              {label}
            </a>
          ))}
        </nav>
      </aside>
      <main id="main-content" className="console-main">
        <ConsoleHeader {...props} />
        {props.children}
      </main>
    </div>
  );
}

function ConsoleHeader({ isRefreshing, onRefresh }: AdminShellProps) {
  const auth = useAuth();
  const identity = auth.identity;
  return (
    <header className="console-topbar">
      <div>
        <p>治理后台</p>
        <h1>资产、模型与 Agent 运行治理</h1>
      </div>
      <div className="header-actions">
        <span className="pill live">
          {identity?.displayName ?? identity?.subject ?? 'authenticated'}
          {identity?.role ? ' · ' + identity.role : ''}
        </span>
        <button
          className="button secondary compact-button"
          type="button"
          disabled={isRefreshing}
          onClick={onRefresh}
        >
          {isRefreshing ? '加载中…' : '刷新数据'}
        </button>
        {auth.mode === 'oidc' ? (
          <button
            className="button ghost compact-button"
            type="button"
            onClick={() => void auth.signOut()}
          >
            退出登录
          </button>
        ) : null}
      </div>
    </header>
  );
}
