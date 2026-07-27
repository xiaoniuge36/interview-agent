'use client';

import { App, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider } from '@interview-agent/auth-client';
import type { ReactNode } from 'react';
import { authClient } from '@/lib/auth';
import { AdminGlobalFeedback } from './AdminGlobalFeedback';
import { AdminWorkspaceProvider, useAdminWorkspace } from './admin-workspace-context';
import { adminAntdTheme } from './admin-theme';

export function AdminProviders({ children }: { children: ReactNode }) {
  return (
    <AdminWorkspaceProvider>
      <AdminThemeProvider>{children}</AdminThemeProvider>
    </AdminWorkspaceProvider>
  );
}

function AdminThemeProvider({ children }: { children: ReactNode }) {
  const { preferences } = useAdminWorkspace();
  return (
    <ConfigProvider
      componentSize={preferences.density === 'compact' ? 'small' : 'middle'}
      locale={zhCN}
      theme={adminAntdTheme(preferences.appearance)}
    >
      <App>
        <AuthProvider client={authClient}>
          <AdminGlobalFeedback />
          {children}
        </AuthProvider>
      </App>
    </ConfigProvider>
  );
}
