'use client';

import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider } from '@interview-agent/auth-client';
import type { ReactNode } from 'react';
import { authClient } from '@/lib/auth';
import { adminAntdTheme } from './admin-theme';

export function AdminProviders({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider componentSize="middle" locale={zhCN} theme={adminAntdTheme}>
      <AuthProvider client={authClient}>{children}</AuthProvider>
    </ConfigProvider>
  );
}
