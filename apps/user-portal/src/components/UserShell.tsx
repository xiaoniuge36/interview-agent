'use client';

import type { ReactNode } from 'react';
import { UserSidebar } from './shell/UserSidebar';
import { UserTopbarActions } from './shell/UserTopbarActions';
import { GlobalSearchProvider } from './search/GlobalSearchProvider';
import { GlobalSearchDialog } from './search/GlobalSearchDialog';
import { GlobalSearchTrigger } from './search/GlobalSearchTrigger';
import { UserAgentWidget } from './user-agent/UserAgentWidget';

type UserShellProps = { children: ReactNode };

/** 应用壳：单层顶栏 + 内容区（页面标题由各页自行承载） */
export function UserShell({ children }: UserShellProps) {
  const shellClassName =
    process.env.NODE_ENV === 'development'
      ? 'app-shell sidebar-shell development-shell'
      : 'app-shell sidebar-shell';
  return (
    <GlobalSearchProvider>
      <div className={shellClassName}>
        <a className="skip-link" href="#main-content">
          跳到主要内容
        </a>
        <header className="consumer-app-header">
          <UserSidebar />
          <GlobalSearchTrigger actions={<UserTopbarActions />} />
        </header>
        <main className="main" id="main-content">
          <div className="page-stage">{children}</div>
        </main>
        <UserAgentWidget />
      </div>
      <GlobalSearchDialog />
    </GlobalSearchProvider>
  );
}
