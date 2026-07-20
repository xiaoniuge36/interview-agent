'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useWorkspaceData } from '@/hooks/useWorkspaceData';

export type WorkspaceContextValue = ReturnType<typeof useWorkspaceData>;

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const workspace = useWorkspaceData({ loadOnMount: false });
  return <WorkspaceContext.Provider value={workspace}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspaceContext(): WorkspaceContextValue {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error('WorkspaceGate 必须在 WorkspaceProvider 内使用。');
  return workspace;
}
