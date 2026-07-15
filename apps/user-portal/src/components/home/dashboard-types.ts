import type { InterviewSession } from '@interview-agent/contracts';

export type NextAction = { href: string; label: string; title: string; description: string };

export type DashboardModel = {
  active: InterviewSession | null;
  action: NextAction;
  completed: number;
  company: string | undefined;
  evidence: string[];
  jobRole: string | undefined;
  profileRole: string | undefined;
  readiness: number;
};

export type TimelineState = 'complete' | 'current' | 'upcoming';

export type TimelineStep = {
  href: string;
  icon: string;
  title: string;
  detail: string;
  state: TimelineState;
};
