'use client';

import { AuthProvider } from '@interview-agent/auth-client';
import type { ReactNode } from 'react';
import { authClient } from '@/lib/auth';
import { ThemePreferencesProvider } from '@/components/theme/ThemePreferencesProvider';

export function WebProviders({ children }: { children: ReactNode }) {
  return (
    <ThemePreferencesProvider>
      <AuthProvider client={authClient}>{children}</AuthProvider>
    </ThemePreferencesProvider>
  );
}
