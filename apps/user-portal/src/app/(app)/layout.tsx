'use client';

import { RequireAuth } from '@/components/auth/RequireAuth';
import { UserShell } from '@/components/UserShell';
import { WorkspaceProvider } from '@/components/workspace/WorkspaceProvider';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <WorkspaceProvider>
        <UserShell>{children}</UserShell>
      </WorkspaceProvider>
    </RequireAuth>
  );
}
