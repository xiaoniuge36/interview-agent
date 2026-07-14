'use client';

import type { JobIntentPayload } from '@interview-agent/contracts';
import { PracticeReportPanel } from './PracticeReportPanel';
import { PracticeSessionPanel } from './PracticeSessionPanel';
import { PracticeStarter } from './PracticeStarter';
import { usePracticeController } from './usePracticeController';

type PracticeWorkspaceProps = {
  jobs: JobIntentPayload[];
};

export function PracticeWorkspace({ jobs }: PracticeWorkspaceProps) {
  const currentJob = jobs[0];
  const roleTitle = currentJob?.intent.targetRole;
  const practice = usePracticeController(currentJob?.intent.id);

  return (
    <section className="panel practice-workspace" aria-labelledby="practice-heading">
      <PracticeHeading {...(roleTitle ? { roleTitle } : {})} />
      {!practice.session ? (
        <PracticeStarter
          title={practice.title}
          {...(roleTitle ? { roleTitle } : {})}
          setTitle={practice.setTitle}
          busy={practice.busy === 'start'}
          onStart={practice.start}
        />
      ) : null}
      {practice.session ? (
        <PracticeSessionPanel
          session={practice.session}
          drafts={practice.drafts}
          setDrafts={practice.setDrafts}
          busy={practice.busy}
          onSave={practice.saveAnswer}
          onFinish={practice.finish}
        />
      ) : null}
      {practice.report ? (
        <PracticeReportPanel report={practice.report} mastery={practice.mastery} />
      ) : null}
      {practice.message ? (
        <p className="practice-message" role="status">
          {practice.message}
        </p>
      ) : null}
    </section>
  );
}

function PracticeHeading({ roleTitle }: { roleTitle?: string }) {
  return (
    <div className="practice-heading">
      <div>
        <div className="eyebrow">专项练习</div>
        <h2 id="practice-heading" className="h2">
          把单题练习做成可积累的能力资产
        </h2>
        <p className="practice-heading-copy">
          围绕真实业务问题完成作答、复盘与能力记录，让每一次练习都服务于下一次面试。
        </p>
      </div>
      <div className="practice-heading-meta">
        <span className="practice-status-chip">回答 · 复盘 · 能力记录</span>
      </div>
      <div className="practice-value-list" aria-label="专项练习能力">
        <span>真实场景题</span>
        <span>岗位化匹配</span>
        <span>能力趋势沉淀</span>
      </div>
      {roleTitle ? <p className="practice-role-summary">当前训练岗位：{roleTitle}</p> : null}
    </div>
  );
}
