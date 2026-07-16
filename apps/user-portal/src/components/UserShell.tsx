'use client';

import type { ReactNode } from 'react';
import { MobileBottomNav } from './shell/MobileBottomNav';
import { UserSidebar } from './shell/UserSidebar';

type UserShellProps = { children: ReactNode };

/** 应用壳：单层顶栏 + 内容区（页面标题由各页自行承载） */
export function UserShell({ children }: UserShellProps) {
  return (
    <div className="app-shell sidebar-shell">
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <UserSidebar />
      <main className="main" id="main-content">
        <div className="page-stage">{children}</div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
