'use client';

import Link from 'next/link';
import { InterviewWorkspace } from '@/components/interview/InterviewWorkspace';
import { WorkspaceGate } from '@/components/workspace/WorkspaceGate';

export function InterviewPageContent() {
  return (
    <WorkspaceGate>
      {(data) => (
        <div className="workspace page-workspace interview-page">
          <header className="page-intro">
            <div>
              <div className="eyebrow">Agent 实战</div>
              <h1 className="h2">模拟面试</h1>
              <p className="muted-text">
                多阶段面试状态机 + 持续追问。作答过程会留下 runtime 事件，结束后生成结构化复盘。
              </p>
            </div>
            <div className="page-intro-actions">
              <Link className="button secondary" href="/job">
                调整岗位
              </Link>
              <Link className="button secondary" href="/reports">
                查看复盘
              </Link>
            </div>
          </header>
          <InterviewWorkspace jobs={data.jobs} />
        </div>
      )}
    </WorkspaceGate>
  );
}