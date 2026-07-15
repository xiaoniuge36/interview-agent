'use client';

import { RequireAuth } from '@/components/auth/RequireAuth';
import { UserShell } from '@/components/UserShell';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <UserShell>{children}</UserShell>
    </RequireAuth>
  );
}