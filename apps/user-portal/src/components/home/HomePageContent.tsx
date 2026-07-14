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
    return <WorkspaceError onRetry={workspace.reload} />;
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
      <PracticeWorkspace jobs={data.jobs} />
      <InterviewWorkspace jobs={data.jobs} />
    </div>
  );
}

function WorkspaceLoading() {
  return (
    <div className="workspace">
      <section className="panel request-state" aria-live="polite">
        <div className="eyebrow">正在准备训练空间</div>
        <h1 className="h2">正在加载你的训练资料</h1>
        <p className="muted-text">请稍候，个人画像、目标岗位和训练记录正在同步。</p>
      </section>
    </div>
  );
}

function WorkspaceError({ onRetry }: { onRetry: () => Promise<void> }) {
  return (
    <div className="workspace">
      <section className="panel request-state" role="alert">
        <div className="eyebrow">暂时无法加载</div>
        <h1 className="h2">训练空间连接失败</h1>
        <p className="muted-text">请检查网络后重新加载；你的已保存训练资料不会丢失。</p>
        <button className="button" type="button" onClick={() => void onRetry()}>
          重新加载
        </button>
      </section>
    </div>
  );
}
