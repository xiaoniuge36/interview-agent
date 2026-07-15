import type {
  InterviewSession,
  InterviewSessionStatus,
  JobIntentPayload,
  ProfilePayload,
} from '@interview-agent/contracts';
import Link from 'next/link';
import { interviewStageLabel } from '@/components/interview/interview-labels';
import { PreparationCard } from './PreparationCard';
import { ProgressNote } from './ProgressNote';
import type { DashboardModel, NextAction, TimelineState, TimelineStep } from './dashboard-types';

type HeroSectionProps = {
  profile: ProfilePayload;
  jobs: JobIntentPayload[];
  interviews: InterviewSession[];
};
type ActionContext = Pick<DashboardModel, 'active' | 'jobRole' | 'profileRole'> & {
  interviewCount: number;
};

const ACTIVE_STATUSES = new Set<InterviewSessionStatus>([
  'created',
  'running',
  'waiting_user',
  'generating_report',
]);
const READINESS_UNIT = 25;
const EVIDENCE_LIMIT = 3;
const LAST_TIMELINE_INDEX = 3;

export function HeroSection({ profile, jobs, interviews }: HeroSectionProps) {
  const model = createDashboardModel(profile, jobs[0], interviews);
  return (
    <section className="agent-dashboard" aria-labelledby="agent-dashboard-title">
      <DashboardTopbar action={model.action} />
      <div className="agent-dashboard-body">
        <div className="agent-dashboard-main">
          <header className="dashboard-heading">
            <h1 id="agent-dashboard-title">
              今天，让 Agent 帮你
              <br />
              把下一次面试练得更准
            </h1>
          </header>
          <PreparationCard model={model} interviews={interviews} />
          <PreparationTimeline model={model} interviews={interviews} />
          <ProgressNote model={model} />
        </div>
        <AgentMemoryPanel model={model} />
      </div>
    </section>
  );
}

function DashboardTopbar({ action }: { action: NextAction }) {
  return (
    <header className="agent-dashboard-topbar">
      <div className="agent-online-status">
        <span className="agent-pulse" aria-hidden="true" />
        <span>
          <strong>Agent 在线</strong>
          <small>随时为你提供支持</small>
        </span>
      </div>
      <Link className="button dashboard-start-button" href={action.href}>
        {action.label}
        <span aria-hidden="true">›</span>
      </Link>
    </header>
  );
}

function PreparationTimeline({
  model,
  interviews,
}: {
  model: DashboardModel;
  interviews: InterviewSession[];
}) {
  return (
    <section className="preparation-timeline" aria-labelledby="timeline-heading">
      <h2 id="timeline-heading">准备记忆时间线</h2>
      <div className="timeline-track">
        {buildTimeline(model, interviews).map((step, index) => (
          <TimelineStepCard step={step} index={index} key={step.title} />
        ))}
      </div>
    </section>
  );
}

function TimelineStepCard({ step, index }: { step: TimelineStep; index: number }) {
  return (
    <Link className={`timeline-step ${step.state}`} href={step.href}>
      <span className="timeline-marker">{step.state === 'complete' ? '✓' : index + 1}</span>
      {index < LAST_TIMELINE_INDEX ? (
        <span className="timeline-connector" aria-hidden="true" />
      ) : null}
      <span className="timeline-status">{timelineStateLabel(step.state)}</span>
      <span className="timeline-icon" aria-hidden="true">
        {step.icon}
      </span>
      <strong>{step.title}</strong>
      <small>{step.detail}</small>
    </Link>
  );
}

function AgentMemoryPanel({ model }: { model: DashboardModel }) {
  return (
    <aside className="agent-memory-panel" aria-label="Agent memory">
      <header className="memory-panel-heading">
        <span className="memory-heading-icon" aria-hidden="true">
          ♧
        </span>
        <strong>Agent memory</strong>
      </header>
      <MemoryGoal model={model} />
      <MemoryReadiness model={model} />
      <MemoryEvidence model={model} />
      <MemoryNextAction action={model.action} />
    </aside>
  );
}

function MemoryGoal({ model }: { model: DashboardModel }) {
  const role = model.jobRole ?? model.profileRole ?? '等待设置目标岗位';
  const detail = model.company
    ? `目标公司：${model.company}`
    : '补充目标岗位后，Agent 会对齐对应的考察重点。';
  return (
    <section className="memory-section memory-goal">
      <span className="memory-section-icon blue" aria-hidden="true">
        ▣
      </span>
      <div>
        <span className="memory-section-title">目标岗位</span>
        <strong>{role}</strong>
        <p>{detail}</p>
      </div>
    </section>
  );
}

function MemoryReadiness({ model }: { model: DashboardModel }) {
  return (
    <section className="memory-section memory-readiness">
      <span className="memory-section-icon green" aria-hidden="true">
        ↗
      </span>
      <div>
        <span className="memory-section-title">面试准备度</span>
        <strong>
          <em>{model.readiness}</em>/100
        </strong>
        <div className="readiness-meter" aria-label={`面试准备度 ${model.readiness} / 100`}>
          <span style={{ width: `${model.readiness}%` }} />
        </div>
        <p>已覆盖 {Math.round(model.readiness / READINESS_UNIT)}/4 个准备项</p>
      </div>
    </section>
  );
}

function MemoryEvidence({ model }: { model: DashboardModel }) {
  return (
    <section className="memory-section memory-evidence">
      <span className="memory-section-icon amber" aria-hidden="true">
        ☆
      </span>
      <div>
        <span className="memory-section-title">重要证据</span>
        <ul>
          {model.evidence.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <Link href="/profile">查看全部证据 ›</Link>
      </div>
    </section>
  );
}

function MemoryNextAction({ action }: { action: NextAction }) {
  return (
    <section className="memory-next-action">
      <span className="memory-section-title">推荐下一步行动</span>
      <strong>{action.title}</strong>
      <p>{action.description}</p>
      <Link className="button secondary memory-action-button" href={action.href}>
        {action.label}
        <span aria-hidden="true">›</span>
      </Link>
    </section>
  );
}

function buildTimeline(model: DashboardModel, interviews: InterviewSession[]): TimelineStep[] {
  const complete = [
    Boolean(model.profileRole),
    Boolean(model.jobRole),
    interviews.length > 0,
    model.completed > 0,
  ];
  const current = complete.findIndex((item) => !item);
  return [
    {
      href: '/profile',
      icon: '▤',
      title: '资料与目标梳理',
      detail: model.profileRole ? '档案已记录' : '补充个人档案',
    },
    {
      href: '/job',
      icon: '▣',
      title: '匹配岗位要求',
      detail: model.jobRole ? '岗位已对齐' : '添加目标 JD',
    },
    {
      href: '/practice',
      icon: '◌',
      title: '专项练习与模拟',
      detail: interviews.length ? '已有练习记录' : '开始第一轮练习',
    },
    {
      href: '/reports',
      icon: '◎',
      title: 'AI 复盘与洞察',
      detail: model.completed ? '复盘已生成' : '完成模拟后生成',
    },
  ].map((step, index) => ({
    ...step,
    state: complete[index] ? 'complete' : index === current ? 'current' : 'upcoming',
  }));
}

function createDashboardModel(
  profile: ProfilePayload,
  job: JobIntentPayload | undefined,
  interviews: InterviewSession[],
): DashboardModel {
  const active = interviews.find((item) => ACTIVE_STATUSES.has(item.status)) ?? null;
  const completed = interviews.filter((item) => item.status === 'report_ready').length;
  const profileRole = profile.profile?.targetRole;
  const jobRole = job?.intent.targetRole;
  const readiness =
    [profileRole, jobRole, interviews.length > 0, completed > 0].filter(Boolean).length *
    READINESS_UNIT;
  const evidence = profile.snapshot?.strengths.slice(0, EVIDENCE_LIMIT) ??
    profile.profile?.projectExperiences.slice(0, EVIDENCE_LIMIT) ?? [
      '完善档案后，Agent 会提取你的优势和项目证据。',
    ];
  const action = resolveAction({ active, profileRole, jobRole, interviewCount: interviews.length });
  return {
    active,
    action,
    completed,
    company: job?.intent.companyContext,
    evidence,
    jobRole,
    profileRole,
    readiness,
  };
}

function resolveAction(context: ActionContext): NextAction {
  if (context.active)
    return {
      href: '/interview',
      label: '继续模拟',
      title: '继续当前模拟面试',
      description: `停在${interviewStageLabel(context.active.stage)}，回到现场继续作答。`,
    };
  if (!context.profileRole)
    return {
      href: '/profile',
      label: '完善档案',
      title: '完善个人档案',
      description: '让 Agent 先理解你的真实经历和优势。',
    };
  if (!context.jobRole)
    return {
      href: '/job',
      label: '选择岗位',
      title: '添加目标岗位',
      description: '粘贴 JD 后，训练会围绕真实岗位要求展开。',
    };
  return {
    href: '/interview',
    label: '开始模拟',
    title: context.interviewCount ? '开启下一轮模拟' : '启动第一轮模拟',
    description: '基于你的档案和目标岗位，开始一场真实的追问练习。',
  };
}

function timelineStateLabel(state: TimelineState) {
  return { complete: '已完成', current: '进行中', upcoming: '待开始' }[state];
}
