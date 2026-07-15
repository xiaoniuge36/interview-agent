'use client';

import Link from 'next/link';
import { WorkspaceGate } from '@/components/workspace/WorkspaceGate';
import { interviewPlanForJob } from '@/lib/interview-roles';
import type { JobIntentPayload, ProfilePayload } from '@interview-agent/contracts';

const FOCUS_PREVIEW = 3;

export function ReportsPageContent() {
  return (
    <WorkspaceGate>
      {(data) => <ReportsBody profile={data.profile} jobs={data.jobs} />}
    </WorkspaceGate>
  );
}

function ReportsBody(props: { profile: ProfilePayload; jobs: JobIntentPayload[] }) {
  const job = props.jobs[0];
  const plan = interviewPlanForJob(job);
  const hasProfile = Boolean(props.profile.profile);
  const hasJob = Boolean(job);
  const focusPreview = plan.focusTags.slice(0, FOCUS_PREVIEW).join(' · ') || '—';

  return (
    <div className="workspace page-workspace">
      <ReportsIntro />
      <div className="reports-grid">
        <ContextPanel
          hasProfile={hasProfile}
          hasJob={hasJob}
          profileRole={props.profile.profile?.targetRole}
          jobRole={job?.intent.targetRole}
          focusPreview={focusPreview}
        />
        <EmptyReportPanel />
      </div>
    </div>
  );
}

function ReportsIntro() {
  return (
    <header className="page-intro">
      <div>
        <div className="eyebrow">证据与改进</div>
        <h1 className="h2">复盘报告</h1>
        <p className="muted-text">
          报告是训练闭环的交付物：评分、缺口、下一步行动。完成模拟面试后，结果会出现在这里。
        </p>
      </div>
      <Link className="button" href="/interview">
        再开一场面试
      </Link>
    </header>
  );
}

function ContextPanel(props: {
  hasProfile: boolean;
  hasJob: boolean;
  profileRole: string | undefined;
  jobRole: string | undefined;
  focusPreview: string;
}) {
  return (
    <section className="panel stack">
      <div className="eyebrow">当前上下文</div>
      <h2 className="h2">Agent 记忆快照</h2>
      <div className="report-context-list">
        <ContextRow
          label="个人画像"
          value={props.hasProfile ? (props.profileRole ?? '已建立') : '尚未建立'}
          ready={props.hasProfile}
          href="/profile"
        />
        <ContextRow
          label="目标岗位"
          value={props.jobRole ?? '尚未匹配'}
          ready={props.hasJob}
          href="/job"
        />
        <ContextRow
          label="重点能力"
          value={props.focusPreview}
          ready={props.hasJob}
          href="/job"
        />
      </div>
    </section>
  );
}

function EmptyReportPanel() {
  return (
    <section className="panel stack report-empty-panel">
      <div className="eyebrow">本轮报告</div>
      <h2 className="h2">完成一场模拟后生成</h2>
      <p className="muted-text">
        面试结束后，这里会展示总分、分阶段得分、证据缺口与下一轮训练建议。你也可以在模拟面试页右侧实时查看本轮复盘。
      </p>
      <div className="report-placeholder-score" aria-hidden="true">
        —
      </div>
      <div className="stack compact">
        <span className="chip">整体表达</span>
        <span className="chip">项目深挖</span>
        <span className="chip">岗位对齐</span>
      </div>
      <Link className="button" href="/interview">
        启动面试 Agent
      </Link>
    </section>
  );
}

function ContextRow(props: {
  label: string;
  value: string;
  ready: boolean;
  href: string;
}) {
  return (
    <Link className="report-context-row" href={props.href}>
      <span>
        <small>{props.label}</small>
        <strong>{props.value}</strong>
      </span>
      <span className={props.ready ? 'chip success' : 'chip'}>
        {props.ready ? '已就绪' : '去完善'}
      </span>
    </Link>
  );
}