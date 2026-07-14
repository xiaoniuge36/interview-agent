'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@interview-agent/auth-client';
import { UserSidebar } from './shell/UserSidebar';
import { NAV_ITEMS, type NavigationId } from './shell/navigation';

const OBSERVER_THRESHOLDS = ['0.01', '0.4', '0.8'].map((value) => Number.parseFloat(value));

type UserShellProps = { children: ReactNode };

export function UserShell({ children }: UserShellProps) {
  const [activeId, setActiveId] = useActiveSection();
  const activeItem = useMemo(() => NAV_ITEMS.find((item) => item.id === activeId), [activeId]);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace">
        跳到主要内容
      </a>
      <UserSidebar activeId={activeId} onNavigate={setActiveId} />
      <main className="main">
        <header className="topbar">
          <div className="page-context">
            <span>个人 AI 面试训练空间</span>
            <strong>{activeItem?.label ?? '训练总览'}</strong>
          </div>
          <IdentityActions />
        </header>
        {children}
      </main>
    </div>
  );
}

function useActiveSection() {
  const [activeId, setActiveId] = useState<NavigationId>('workspace');
  useEffect(() => {
    const observer = new IntersectionObserver(updateActiveSection, {
      rootMargin: '-20% 0px -62%',
      threshold: OBSERVER_THRESHOLDS,
    });
    NAV_ITEMS.forEach((item) => observeSection(observer, item.id));
    return () => observer.disconnect();
  }, []);
  return [activeId, setActiveId] as const;
  function updateActiveSection(entries: IntersectionObserverEntry[]) {
    const visible = [...entries].filter((entry) => entry.isIntersecting).sort(compareVisibility)[0];
    if (visible && isNavigationId(visible.target.id)) setActiveId(visible.target.id);
  }
}

function observeSection(observer: IntersectionObserver, id: NavigationId) {
  const target = document.getElementById(id);
  if (target) observer.observe(target);
}

function compareVisibility(left: IntersectionObserverEntry, right: IntersectionObserverEntry) {
  return right.intersectionRatio - left.intersectionRatio;
}

function isNavigationId(value: string): value is NavigationId {
  return NAV_ITEMS.some((item) => item.id === value);
}

function IdentityActions() {
  const auth = useAuth();
  const identity = auth.identity;
  return (
    <div className="identity-actions">
      <div className="account-chip">
        <span className="account-initial">{initial(identity?.displayName)}</span>
        <span>
          <strong>{identity?.displayName ?? '训练用户'}</strong>
          <small>{identity?.role === 'user' ? '个人账号' : (identity?.role ?? '已验证账号')}</small>
        </span>
      </div>
      {auth.mode !== 'development' ? (
        <button className="text-button" type="button" onClick={() => void auth.signOut()}>
          退出登录
        </button>
      ) : null}
    </div>
  );
}

function initial(value: string | undefined) {
  return value?.trim().slice(0, 1).toUpperCase() || 'U';
}
