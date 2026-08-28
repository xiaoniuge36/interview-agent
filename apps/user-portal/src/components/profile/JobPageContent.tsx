'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { interviewHrefForJob } from '@/lib/job-handoff';
import { JobIntentPanel } from './JobIntentPanel';
import { LatestAnalysis } from './LatestAnalysis';
import { WorkspaceGate } from '@/components/workspace/WorkspaceGate';

export function JobPageContent() {
  const router = useRouter();
  return (
    <WorkspaceGate>
      {(data) => (
        <div className="workspace page-workspace job-page-workspace">
          <header className="page-intro job-page-intro">
            <div>
              <div className="eyebrow">训练上下文 · JD 对齐</div>
              <h1 className="h2">把目标岗位变成下一场模拟面试</h1>
              <p className="muted-text">
                明确岗位要求、业务场景与表达重点，让 Agent
                的问题、追问和复盘都围绕你真正准备的岗位展开。
              </p>
            </div>
            <div className="page-intro-actions">
              <Link className="button secondary" href="/profile">
                返回画像
              </Link>
            </div>
          </header>
          <div className="job-intent-layout">
            <JobIntentPanel
              savedIntent={data.jobs[0]?.intent ?? null}
              onCreated={data.addJob}
              onStart={(job) => router.push(interviewHrefForJob(job.intent.id))}
            />
            <LatestAnalysis job={data.jobs[0]} profile={data.profile} />
          </div>
        </div>
      )}
    </WorkspaceGate>
  );
}
