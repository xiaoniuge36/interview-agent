'use client';

import { ProfilePanel } from './ProfilePanel';
import { ProfileMemoryRail } from './ProfileMemoryRail';
import { WorkspaceGate } from '@/components/workspace/WorkspaceGate';
import Link from 'next/link';

export function ProfilePageContent() {
  return (
    <WorkspaceGate>
      {(data) => (
        <div className="workspace page-workspace profile-page-workspace">
          <PageIntro
            eyebrow="训练画像输入"
            title="让下一轮训练更贴近你"
            copy="填写会影响推荐题、项目追问和复盘建议的真实经历；保存后 Agent 会立即更新可用线索。"
            next={{ href: '/job', label: '继续完善目标岗位' }}
          />
          <div className="profile-agent-layout">
            <ProfilePanel profile={data.profile} onChanged={data.updateProfile} />
            <ProfileMemoryRail profile={data.profile} />
          </div>
        </div>
      )}
    </WorkspaceGate>
  );
}

function PageIntro(props: {
  eyebrow: string;
  title: string;
  copy: string;
  next: { href: string; label: string };
}) {
  return (
    <header className="page-intro profile-page-intro">
      <div>
        <div className="eyebrow">{props.eyebrow}</div>
        <h1 className="h2">{props.title}</h1>
        <p className="muted-text">{props.copy}</p>
      </div>
      <Link className="button secondary" href={props.next.href}>
        {props.next.label}
      </Link>
    </header>
  );
}
