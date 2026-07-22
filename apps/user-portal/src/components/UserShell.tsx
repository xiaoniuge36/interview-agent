'use client';

import type { ReactNode } from 'react';
import { MobileBottomNav } from './shell/MobileBottomNav';
import { UserSidebar } from './shell/UserSidebar';
import { UserTopbarActions } from './shell/UserTopbarActions';
import { GlobalSearchProvider } from './search/GlobalSearchProvider';
import { GlobalSearchDialog } from './search/GlobalSearchDialog';
import { GlobalSearchTrigger } from './search/GlobalSearchTrigger';
import { UserAgentWidget } from './user-agent/UserAgentWidget';

type UserShellProps = { children: ReactNode };

/** 应用壳：单层顶栏 + 内容区（页面标题由各页自行承载） */
export function UserShell({ children }: UserShellProps) {
  return (
    <GlobalSearchProvider>
      <div className="app-shell sidebar-shell">
        <a className="skip-link" href="#main-content">
          跳到主要内容
        </a>
        <UserSidebar />
        <main className="main" id="main-content">
          <GlobalSearchTrigger actions={<UserTopbarActions />} />
          <div className="page-stage">{children}</div>
        </main>
        <MobileBottomNav />
      </div>
      <GlobalSearchDialog />
      <UserAgentWidget />
    </GlobalSearchProvider>
  );
}
