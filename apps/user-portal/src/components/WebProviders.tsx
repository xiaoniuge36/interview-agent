'use client';

import { AuthProvider } from '@interview-agent/auth-client';
import type { ReactNode } from 'react';
import { authClient } from '@/lib/auth';
import { ThemePreferencesProvider } from '@/components/theme/ThemePreferencesProvider';
import { MotionSystemProvider } from '@/components/motion/MotionSystemProvider';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';
import { RouteChunkRecovery } from '@/components/shell/RouteChunkRecovery';

export function WebProviders({ children }: { children: ReactNode }) {
  return (
    <>
      <RouteChunkRecovery />
      <AuthProvider client={authClient}>
        <ThemePreferencesProvider>
          <MotionSystemProvider>
            <NotificationProvider>{children}</NotificationProvider>
          </MotionSystemProvider>
        </ThemePreferencesProvider>
      </AuthProvider>
    </>
  );
}
