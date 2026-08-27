import type { PracticeReport } from '@interview-agent/contracts';
import { createPracticeSession } from './practice-api';

type CreatePractice = typeof createPracticeSession;
type WeaknessReviewWorkflow = {
  createSession: CreatePractice;
  setStarting: (starting: boolean) => void;
  onSuccess: (sessionId: string) => void;
  onError: (error: unknown) => void;
};

export const REVIEWABLE_WEAK_SCORE = 60;

export function createExclusiveWeaknessReviewRunner() {
  let running = false;
  return async function run(action: () => Promise<void>): Promise<boolean> {
    if (running) return false;
    running = true;
    try {
      await action();
      return true;
    } finally {
      running = false;
    }
  };
}

export function hasReviewableWeakness(report: PracticeReport | null) {
  return Boolean(
    report?.itemEvaluations.some((evaluation) => evaluation.score < REVIEWABLE_WEAK_SCORE),
  );
}

export async function createWeaknessReviewSession(
  createSession: CreatePractice = createPracticeSession,
) {
  const session = await createSession({
    title: '薄弱项复练',
    mode: 'weakness_review',
  });
  return session.id;
}

export async function startWeaknessReview(workflow: WeaknessReviewWorkflow) {
  workflow.setStarting(true);
  try {
    const sessionId = await createWeaknessReviewSession(workflow.createSession);
    workflow.onSuccess(sessionId);
  } catch (error) {
    workflow.setStarting(false);
    workflow.onError(error);
  }
}
