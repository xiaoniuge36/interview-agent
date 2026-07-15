'use client';

import { ProfilePanel } from './ProfilePanel';
import { WorkspaceGate } from '@/components/workspace/WorkspaceGate';
import Link from 'next/link';

export function ProfilePageContent() {
  return (
    <WorkspaceGate>
      {(data) => (
        <div className="workspace page-workspace">
          <PageIntro
            eyebrow="能力证据库"
            title="建立候选人画像"
            copy="只填写会影响面试的问题：目标岗位、经验、技术栈和项目证据。Agent 会据此生成追问链。"
            next={{ href: '/job', label: '下一步：目标岗位' }}
          />
          <div className="page-single">
            <ProfilePanel profile={data.profile} onChanged={data.updateProfile} />
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
    <header className="page-intro">
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