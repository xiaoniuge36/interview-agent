'use client';

import { AuthProvider } from '@interview-agent/auth-client';
import type { ReactNode } from 'react';
import { authClient } from '@/lib/auth';
import { ThemePreferencesProvider } from '@/components/theme/ThemePreferencesProvider';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';
import { RouteChunkRecovery } from '@/components/shell/RouteChunkRecovery';

export function WebProviders({ children }: { children: ReactNode }) {
  return (
    <>
      <RouteChunkRecovery />
      <ThemePreferencesProvider>
        <NotificationProvider>
          <AuthProvider client={authClient}>{children}</AuthProvider>
        </NotificationProvider>
      </ThemePreferencesProvider>
    </>
  );
}
