'use client';

import { InterviewWorkspace } from '@/components/interview/InterviewWorkspace';
import { ProfileJobPanel } from '@/components/profile/ProfileJobPanel';
import { PracticeWorkspace } from '@/components/practice/PracticeWorkspace';
import { useWorkspaceData } from '@/hooks/useWorkspaceData';
import { HeroSection } from './HeroSection';

export function HomePageContent() {
  const workspace = useWorkspaceData();
  if (workspace.state.status === 'loading') return <WorkspaceLoading />;
  if (workspace.state.status === 'error' || !workspace.state.data) {
    return <WorkspaceError error={workspace.state.error} onRetry={workspace.reload} />;
  }
  const data = workspace.state.data;
  return (
    <div className="workspace">
      <HeroSection profile={data.profile} jobs={data.jobs} />
      <ProfileJobPanel
        profile={data.profile}
        jobs={data.jobs}
        onProfileChanged={workspace.updateProfile}
        onJobCreated={workspace.addJob}
      />
      <PracticeWorkspace />
      <InterviewWorkspace jobs={data.jobs} />
    </div>
  );
}

function WorkspaceLoading() {
  return (
    <div className="workspace">
      <section className="panel request-state" aria-live="polite">
        <div className="eyebrow">Loading</div>
        <h1 className="h2">正在加载安全工作台</h1>
        <p className="muted-text">正在校验 Product API 数据契约。</p>
      </section>
    </div>
  );
}

function WorkspaceError(props: { error: Error | null; onRetry: () => Promise<void> }) {
  return (
    <div className="workspace">
      <section className="panel request-state" role="alert">
        <div className="eyebrow">Request Failed</div>
        <h1 className="h2">工作台数据加载失败</h1>
        <p className="error-text">{props.error?.message ?? '未知错误'}</p>
        <button className="button" type="button" onClick={() => void props.onRetry()}>
          重新加载
        </button>
      </section>
    </div>
  );
}
