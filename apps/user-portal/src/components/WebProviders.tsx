'use client';

import { AuthProvider } from '@interview-agent/auth-client';
import type { ReactNode } from 'react';
import { authClient } from '@/lib/auth';
import { ThemePreferencesProvider } from '@/components/theme/ThemePreferencesProvider';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';

export function WebProviders({ children }: { children: ReactNode }) {
  return (
    <ThemePreferencesProvider>
      <NotificationProvider>
        <AuthProvider client={authClient}>{children}</AuthProvider>
      </NotificationProvider>
    </ThemePreferencesProvider>
  );
}
