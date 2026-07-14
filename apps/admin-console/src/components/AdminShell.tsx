'use client';

import { useAuth } from '@interview-agent/auth-client';
import { useState, type ReactNode } from 'react';
import {
  ADMIN_NAV_ITEMS,
  getAdminNavigationItem,
  type AdminView,
} from './admin-navigation';
import { ConsoleIcon } from './ConsoleIcon';

const TIME_FORMATTER = new Intl.DateTimeFormat('zh-CN', { timeStyle: 'medium' });

type AdminShellProps = {
  children: ReactNode;
  activeView: AdminView;
  isRefreshing: boolean;
  lastUpdatedAt: string | null;
  onRefresh: () => void;
  onViewChange: (view: AdminView) => void;
};

type ConsoleSidebarProps = Pick<AdminShellProps, 'activeView' | 'onViewChange'>;

export function AdminShell(props: AdminShellProps) {
  return (
    <div className="console-shell">
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <ConsoleSidebar activeView={props.activeView} onViewChange={props.onViewChange} />
      <main id="main-content" className="console-main" tabIndex={-1}>
        <ConsoleHeader
          activeView={props.activeView}
          isRefreshing={props.isRefreshing}
          lastUpdatedAt={props.lastUpdatedAt}
          onRefresh={props.onRefresh}
        />
        {props.children}
      </main>
    </div>
  );
}

function ConsoleSidebar({ activeView, onViewChange }: ConsoleSidebarProps) {
  return (
    <aside className="console-sidebar">
      <ConsoleBrand onViewChange={onViewChange} />
      <ConsoleWorkspace />
      <ConsoleNavigation activeView={activeView} onViewChange={onViewChange} />
      <ConsoleSidebarFooter />
    </aside>
  );
}

function ConsoleBrand({ onViewChange }: Pick<ConsoleSidebarProps, 'onViewChange'>) {
  return (
    <button
      aria-label="打开治理总览"
      className="brand-block brand-button"
      onClick={() => onViewChange('overview')}
      type="button"
    >
      <span className="brand-symbol">
        <ConsoleIcon name="overview" size={18} />
      </span>
      <span className="brand-copy">
        <small>INTERVIEW AGENT</small>
        <strong>治理控制台</strong>
      </span>
    </button>
  );
}

function ConsoleWorkspace() {
  return (
    <div className="console-workspace" aria-label="当前治理范围">
      <span className="console-workspace-icon">
        <ConsoleIcon name="workspace" size={16} />
      </span>
      <span>
        <small>当前空间</small>
        <strong>面试资产治理</strong>
      </span>
    </div>
  );
}

function ConsoleNavigation({ activeView, onViewChange }: ConsoleSidebarProps) {
  return (
    <nav className="console-nav" aria-label="治理后台主导航">
      <span className="console-nav-label">治理中心</span>
      {ADMIN_NAV_ITEMS.map((item) => (
        <button
          aria-controls={`admin-view-${item.id}`}
          aria-current={activeView === item.id ? 'page' : undefined}
          className={activeView === item.id ? 'active' : undefined}
          key={item.id}
          onClick={() => onViewChange(item.id)}
          type="button"
        >
          <span className="console-nav-icon">
            <ConsoleIcon name={item.icon} size={18} />
          </span>
          <span className="console-nav-copy">
            <strong>{item.label}</strong>
            <small>{item.helper}</small>
          </span>
        </button>
      ))}
    </nav>
  );
}

function ConsoleSidebarFooter() {
  return (
    <div className="console-sidebar-footer">
      <span>操作原则</span>
      <strong>先审核，再发布</strong>
      <small>来源、模型与运行变更均保留可追溯记录。</small>
    </div>
  );
}

function ConsoleHeader({
  activeView,
  isRefreshing,
  lastUpdatedAt,
  onRefresh,
}: Pick<AdminShellProps, 'activeView' | 'isRefreshing' | 'lastUpdatedAt' | 'onRefresh'>) {
  const activeItem = getAdminNavigationItem(activeView);
  return (
    <header className="console-topbar" aria-busy={isRefreshing}>
      <div className="console-page-title">
        <p>
          <ConsoleIcon name={activeItem.icon} size={15} />
          {activeItem.label}
        </p>
        <h1>{activeItem.heading}</h1>
      </div>
      <HeaderActions
        isRefreshing={isRefreshing}
        lastUpdatedAt={lastUpdatedAt}
        onRefresh={onRefresh}
      />
      {isRefreshing ? <span className="console-refresh-bar" aria-hidden="true" /> : null}
    </header>
  );
}

function HeaderActions(
  props: Pick<AdminShellProps, 'isRefreshing' | 'lastUpdatedAt' | 'onRefresh'>,
) {
  const auth = useAuth();
  const [isSigningOut, setSigningOut] = useState(false);
  const identity = auth.identity;
  const signOut = async () => {
    setSigningOut(true);
    await auth.signOut();
    setSigningOut(false);
  };
  return (
    <div className="header-actions">
      <RefreshSummary isRefreshing={props.isRefreshing} lastUpdatedAt={props.lastUpdatedAt} />
      <span className="pill live">
        {identity?.displayName ?? identity?.subject ?? '已认证'}
        {identity?.role ? ' · ' + identity.role : ''}
      </span>
      <button
        className="button secondary compact-button"
        disabled={props.isRefreshing}
        onClick={props.onRefresh}
        type="button"
      >
        <ConsoleIcon name="refresh" size={16} />
        {props.isRefreshing ? '同步中…' : '刷新数据'}
      </button>
      {auth.mode === 'development' ? (
        <span className="development-session" title="开发模式使用固定 Demo 身份，不创建真实登录会话">
          固定开发身份
        </span>
      ) : (
        <button
          className="button ghost compact-button"
          disabled={isSigningOut}
          onClick={() => void signOut()}
          type="button"
        >
          <ConsoleIcon name="logout" size={16} />
          {isSigningOut ? '退出中…' : '退出登录'}
        </button>
      )}
    </div>
  );
}

function RefreshSummary(props: Pick<AdminShellProps, 'isRefreshing' | 'lastUpdatedAt'>) {
  return (
    <span className="refresh-summary" role="status" aria-live="polite">
      <strong>{props.isRefreshing ? '正在同步全部数据' : '数据已同步'}</strong>
      <small>{formatUpdatedAt(props.lastUpdatedAt)}</small>
    </span>
  );
}

function formatUpdatedAt(value: string | null): string {
  if (!value) return '等待首次加载';
  return `更新于 ${TIME_FORMATTER.format(new Date(value))}`;
}
