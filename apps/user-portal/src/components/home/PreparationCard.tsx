import type { InterviewSession, InterviewSessionStatus } from '@interview-agent/contracts';
import Link from 'next/link';
import { interviewStageLabel } from '@/components/interview/interview-labels';
import type { DashboardModel } from './dashboard-types';

export function PreparationCard({
  model,
  interviews,
}: {
  model: DashboardModel;
  interviews: InterviewSession[];
}) {
  return (
    <section className="preparation-card" aria-labelledby="continue-preparing-heading">
      <h2 id="continue-preparing-heading">继续准备</h2>
      <PreparationTarget model={model} />
      <PreparationDetails action={model.action} latest={interviews[0]} />
    </section>
  );
}

function PreparationTarget({ model }: { model: DashboardModel }) {
  return (
    <Link className="preparation-target" href={model.action.href}>
      <span className="dashboard-symbol mint" aria-hidden="true">
        ▣
      </span>
      <span>
        <small>目标岗位</small>
        <strong>{model.jobRole ?? model.profileRole ?? '完善你的求职目标'}</strong>
      </span>
      <span className="preparation-arrow" aria-hidden="true">
        ›
      </span>
    </Link>
  );
}

function PreparationDetails({
  action,
  latest,
}: {
  action: DashboardModel['action'];
  latest: InterviewSession | undefined;
}) {
  return (
    <div className="preparation-detail-grid">
      <PreparationDetail
        label="下一步任务"
        icon="▶"
        title={action.title}
        description={action.description}
      />
      <PreparationDetail
        label="最近一次练习"
        icon="▣"
        title={latest?.title ?? '还没有开始练习'}
        description={
          latest
            ? `${interviewStageLabel(latest.stage)} · ${sessionState(latest.status)}`
            : '准备完成后，Agent 会为你保留每次进展'
        }
      />
    </div>
  );
}

function PreparationDetail({
  label,
  icon,
  title,
  description,
}: {
  label: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="preparation-detail">
      <span className="detail-label">{label}</span>
      <span className="detail-row">
        <span className="detail-icon blue" aria-hidden="true">
          {icon}
        </span>
        <span>
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
      </span>
    </div>
  );
}

function sessionState(status: InterviewSessionStatus) {
  return {
    created: '准备中',
    running: '进行中',
    waiting_user: '待作答',
    generating_report: '生成复盘中',
    report_ready: '已完成',
    failed: '异常',
    cancelled: '已结束',
  }[status];
}
