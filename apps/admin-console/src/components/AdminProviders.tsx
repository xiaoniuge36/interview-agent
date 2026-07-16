'use client';

import { App, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider } from '@interview-agent/auth-client';
import type { ReactNode } from 'react';
import { authClient } from '@/lib/auth';
import { AdminGlobalFeedback } from './AdminGlobalFeedback';
import { adminAntdTheme } from './admin-theme';

export function AdminProviders({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider componentSize="middle" locale={zhCN} theme={adminAntdTheme}>
      <App>
        <AuthProvider client={authClient}>
          <AdminGlobalFeedback />
          {children}
        </AuthProvider>
      </App>
    </ConfigProvider>
  );
}
