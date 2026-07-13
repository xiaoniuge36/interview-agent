import type { JobIntentPayload, ProfilePayload } from '@interview-agent/contracts';

type HeroSectionProps = { profile: ProfilePayload; jobs: JobIntentPayload[] };
type TrainingStep = { label: string; detail: string; ready: boolean };

export function HeroSection({ profile, jobs }: HeroSectionProps) {
  const currentProfile = profile.profile;
  const hasProfile = currentProfile !== null;
  const hasJob = jobs.length > 0;
  const nextAction = resolveNextAction(hasProfile, hasJob);
  const steps = trainingSteps({
    profileRole: currentProfile?.targetRole,
    jobRole: jobs[0]?.intent.targetRole,
    hasProfile,
    hasJob,
  });
  return (
    <section id="workspace" className="hero">
      <div className="hero-main">
        <div className="eyebrow">Training workspace</div>
        <h1 className="h1">Make your next interview response verifiable.</h1>
        <p className="hero-copy">
          Bring role targets, project experience, and feedback into one training path, so every next
          answer starts with evidence.
        </p>
        <a className="button hero-action" href={nextAction.href}>
          {nextAction.label}
          <span aria-hidden="true">?</span>
        </a>
        <TrainingRail steps={steps} />
      </div>
      <ReadinessCard nextAction={nextAction} hasProfile={hasProfile} hasJob={hasJob} />
    </section>
  );
}

function TrainingRail({ steps }: { steps: TrainingStep[] }) {
  return (
    <div className="training-rail" aria-label="Training readiness progress">
      {steps.map((step, index) => (
        <div className={step.ready ? 'training-step complete' : 'training-step'} key={step.label}>
          <span className="training-step-index">0{index + 1}</span>
          <div>
            <strong>{step.label}</strong>
            <small>{step.detail}</small>
          </div>
          <span className="training-step-state">{step.ready ? 'Complete' : 'Pending'}</span>
        </div>
      ))}
    </div>
  );
}

type ReadinessCardProps = {
  nextAction: ReturnType<typeof resolveNextAction>;
  hasProfile: boolean;
  hasJob: boolean;
};

function ReadinessCard({ nextAction, hasProfile, hasJob }: ReadinessCardProps) {
  return (
    <aside className="readiness-card" aria-label="Suggested next action">
      <span className="readiness-label">Today&apos;s recommendation</span>
      <div className="readiness-orbit" aria-hidden="true">
        <span>Readiness</span>
        <strong>{readinessScore(hasProfile, hasJob)}</strong>
      </div>
      <h2>{nextAction.title}</h2>
      <p>{nextAction.description}</p>
      <div className="readiness-footer">
        <span>Training path</span>
        <strong>{readyStepCount(hasProfile, hasJob)} / 3</strong>
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
      label: 'Candidate profile',
      detail: input.profileRole ?? 'Add your experience and strengths',
      ready: input.hasProfile,
    },
    {
      label: 'Target role',
      detail: input.jobRole ?? 'Add a JD or target direction',
      ready: input.hasJob,
    },
    { label: 'Mock interview', detail: 'Record every answer in the practice flow', ready: false },
  ];
}

function resolveNextAction(hasProfile: boolean, hasJob: boolean) {
  if (!hasProfile)
    return {
      href: '#profile',
      label: 'Complete candidate profile',
      title: 'Establish a baseline first',
      description:
        'Your role, seniority, and project experience are used to generate relevant questions and feedback.',
    };
  if (!hasJob)
    return {
      href: '#job-intent',
      label: 'Add a target role',
      title: 'Add a target role',
      description: 'Associating a job description makes questions closer to your real interview.',
    };
  return {
    href: '#interview',
    label: 'Start a mock interview',
    title: 'You are ready to practice',
    description: 'The baseline information is ready. Select a role and begin the interview.',
  };
}

function readinessScore(hasProfile: boolean, hasJob: boolean) {
  return hasProfile && hasJob ? '72' : hasProfile || hasJob ? '38' : '12';
}

function readyStepCount(hasProfile: boolean, hasJob: boolean) {
  return Number(hasProfile) + Number(hasJob);
}
