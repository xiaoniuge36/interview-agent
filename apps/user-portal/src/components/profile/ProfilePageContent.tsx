'use client';

import { ProfilePanel } from './ProfilePanel';
import { ProfileMemoryRail } from './ProfileMemoryRail';
import { WorkspaceGate } from '@/components/workspace/WorkspaceGate';

export function ProfilePageContent() {
  return (
    <WorkspaceGate>
      {(data) => (
        <div className="workspace page-workspace profile-page-workspace">
          <ProfilePageIntro />
          <div className="profile-agent-layout motion-stagger">
            <ProfilePanel profile={data.profile} onChanged={data.updateProfile} />
            <ProfileMemoryRail profile={data.profile} />
          </div>
        </div>
      )}
    </WorkspaceGate>
  );
}

export function ProfilePageIntro() {
  return (
    <header className="page-intro profile-page-intro">
      <div>
        <div className="eyebrow">训练画像输入</div>
        <h1 className="h2">让下一轮训练更贴近你</h1>
        <p className="muted-text">
          填写会影响推荐题、项目追问和复盘建议的真实经历；保存后 Agent 会立即更新可用线索。
        </p>
      </div>
    </header>
  );
}
