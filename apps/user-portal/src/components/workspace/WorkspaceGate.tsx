'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { RouteLoadingState } from '@/components/shell/RouteLoadingState';
import type { WorkspaceData } from '@/lib/workspace-api';
import {
  useWorkspaceContext,
  type WorkspaceContextValue,
} from '@/components/workspace/WorkspaceProvider';

type WorkspaceGateProps = {
  children: (
    data: WorkspaceData & {
      updateProfile: WorkspaceContextValue['updateProfile'];
      addJob: WorkspaceContextValue['addJob'];
      reload: WorkspaceContextValue['reload'];
    },
  ) => ReactNode;
};

/** 统一加载/错误态，各页面只关心 ready 后的数据 */
export function WorkspaceGate({ children }: WorkspaceGateProps) {
  const workspace = useWorkspaceContext();
  const { reload, state } = workspace;
  useEffect(() => {
    if (state.status === 'idle') void reload();
  }, [reload, state.status]);
  if (state.status === 'idle' || state.status === 'loading') {
    return <RouteLoadingState label="正在同步训练上下文" />;
  }
  if (state.status === 'error' || !state.data) {
    return <WorkspaceError onRetry={reload} />;
  }
  return (
    <>
      {children({
        ...state.data,
        updateProfile: workspace.updateProfile,
        addJob: workspace.addJob,
        reload,
      })}
    </>
  );
}

function WorkspaceError({ onRetry }: { onRetry: () => Promise<void> }) {
  return (
    <section className="panel request-state page-card" role="alert">
      <div className="eyebrow">暂时无法加载</div>
      <h1 className="h2">训练空间连接失败</h1>
      <p className="muted-text">请检查网络后重试；已保存的资料不会丢失。</p>
      <button className="button" type="button" onClick={() => void onRetry()}>
        重新加载
      </button>
    </section>
  );
}
