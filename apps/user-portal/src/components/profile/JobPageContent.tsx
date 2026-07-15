'use client';

import Link from 'next/link';
import { JobIntentPanel } from './JobIntentPanel';
import { WorkspaceGate } from '@/components/workspace/WorkspaceGate';

export function JobPageContent() {
  return (
    <WorkspaceGate>
      {(data) => (
        <div className="workspace page-workspace">
          <header className="page-intro">
            <div>
              <div className="eyebrow">JD 对齐</div>
              <h1 className="h2">匹配目标岗位模型</h1>
              <p className="muted-text">
                从常见岗位模板开始，或直接粘贴真实 JD。下一场模拟会围绕岗位能力重点进行追问。
              </p>
            </div>
            <div className="page-intro-actions">
              <Link className="button secondary" href="/profile">
                返回画像
              </Link>
              <Link className="button" href="/interview">
                去模拟面试
              </Link>
            </div>
          </header>
          <div className="page-single">
            <JobIntentPanel
              profile={data.profile}
              latestJob={data.jobs[0]}
              onCreated={data.addJob}
            />
          </div>
        </div>
      )}
    </WorkspaceGate>
  );
}