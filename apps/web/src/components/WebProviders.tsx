'use client';

import { AuthProvider } from '@interview-agent/auth-client';
import type { ReactNode } from 'react';
import { authClient } from '@/lib/auth';

export function WebProviders({ children }: { children: ReactNode }) {
  return <AuthProvider client={authClient}>{children}</AuthProvider>;
}
