'use client';

import Link from 'next/link';
import { PracticeWorkspace } from '@/components/practice/PracticeWorkspace';
import { WorkspaceGate } from '@/components/workspace/WorkspaceGate';

export function PracticePageContent() {
  return (
    <WorkspaceGate>
      {(data) => (
        <div className="workspace page-workspace">
          <header className="page-intro">
            <div>
              <div className="eyebrow">单题打磨</div>
              <h1 className="h2">专项练习</h1>
              <p className="muted-text">
                围绕真实业务问题完成作答、复盘与能力记录，让每一次练习都服务于下一次面试。
              </p>
            </div>
            <Link className="button secondary" href="/interview">
              进入模拟面试
            </Link>
          </header>
          <PracticeWorkspace jobs={data.jobs} />
        </div>
      )}
    </WorkspaceGate>
  );
}