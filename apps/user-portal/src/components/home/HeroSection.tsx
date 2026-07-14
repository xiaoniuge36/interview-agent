import type { JobIntentPayload, ProfilePayload } from '@interview-agent/contracts';
import { interviewPlanForJob } from '@/lib/interview-roles';

type HeroSectionProps = { profile: ProfilePayload; jobs: JobIntentPayload[] };
type TrainingStep = { label: string; detail: string; ready: boolean };

export function HeroSection({ profile, jobs }: HeroSectionProps) {
  const currentProfile = profile.profile;
  const hasProfile = currentProfile !== null;
  const currentJob = jobs[0];
  const hasJob = Boolean(currentJob);
  const nextAction = resolveNextAction(hasProfile, hasJob);
  const plan = interviewPlanForJob(currentJob);
  const steps = trainingSteps({
    profileRole: currentProfile?.targetRole,
    jobRole: currentJob?.intent.targetRole,
    hasProfile,
    hasJob,
  });
  return (
    <section id="workspace" className="hero">
      <div className="hero-main">
        <div className="eyebrow">AI 面试训练工作台</div>
        <h1 className="h1">把项目经历，练成拿 Offer 时说得清、站得住的能力证据。</h1>
        <p className="hero-copy">
          从真实经历、目标岗位到实战追问，形成一条可以持续复用的训练路径。
          每一次回答都会沉淀为下一次面试的准备资产。
        </p>
        <a className="button hero-action" href={nextAction.href}>
          {nextAction.label}
          <span aria-hidden="true">→</span>
        </a>
        <TrainingRail steps={steps} />
      </div>
      <TrainingBrief nextAction={nextAction} plan={plan} />
    </section>
  );
}

function TrainingRail({ steps }: { steps: TrainingStep[] }) {
  return (
    <div className="training-rail" aria-label="训练路径">
      {steps.map((step, index) => (
        <div className={step.ready ? 'training-step complete' : 'training-step'} key={step.label}>
          <span className="training-step-index">0{index + 1}</span>
          <div>
            <strong>{step.label}</strong>
            <small>{step.detail}</small>
          </div>
          <span className="training-step-state">{step.ready ? '已完成' : '待完成'}</span>
        </div>
      ))}
    </div>
  );
}

type TrainingBriefProps = {
  nextAction: ReturnType<typeof resolveNextAction>;
  plan: ReturnType<typeof interviewPlanForJob>;
};

function TrainingBrief({ nextAction, plan }: TrainingBriefProps) {
  return (
    <aside className="training-brief" aria-label="当前训练简报">
      <span className="training-brief-label">当前训练简报</span>
      <span className="training-brief-caption">本轮岗位</span>
      <h2>{plan.roleTitle}</h2>
      <div className="focus-tag-list" aria-label="重点考察能力">
        {plan.focusTags.map((tag) => (
          <span className="focus-tag" key={tag}>
            {tag}
          </span>
        ))}
      </div>
      <div className="training-brief-next">
        <span>推荐下一步</span>
        <strong>{nextAction.title}</strong>
        <p>{nextAction.description}</p>
      </div>
    </aside>
  );
}

type TrainingStepInput = {
  profileRole: string | undefined;
  jobRole: string | undefined;
  hasProfile: boolean;
  hasJob: boolean;
};

function trainingSteps(input: TrainingStepInput): TrainingStep[] {
  return [
    {
      label: '个人画像',
      detail: input.profileRole ?? '补充你的经历与优势',
      ready: input.hasProfile,
    },
    {
      label: '目标岗位',
      detail: input.jobRole ?? '选择岗位模板或粘贴真实 JD',
      ready: input.hasJob,
    },
    { label: '模拟面试', detail: '完成资料后开始逐题训练', ready: false },
  ];
}

function resolveNextAction(hasProfile: boolean, hasJob: boolean) {
  if (!hasProfile) {
    return {
      href: '#profile',
      label: '完善个人画像',
      title: '先建立能力证据库',
      description: '补充目标岗位、代表经历与当前能力，让问题和建议更贴合你。',
    };
  }
  if (!hasJob) {
    return {
      href: '#job-intent',
      label: '选择目标岗位',
      title: '匹配真实岗位模型',
      description: '选择岗位模板或粘贴 JD，让模拟问题更接近真实面试。',
    };
  }
  return {
    href: '#interview',
    label: '开始模拟面试',
    title: '开始一次实战模拟',
    description: '岗位资料已准备好，选择目标岗位后开始逐题作答与复盘。',
  };
}
