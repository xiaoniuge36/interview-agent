import type { PracticeRecommendation } from '@interview-agent/contracts';
import type { createPracticeSession } from '@/lib/practice-api';

type HomeRecommendationStartWorkflow = {
  recommendation: PracticeRecommendation;
  createSession: typeof createPracticeSession;
  setBusyRecommendationId: (recommendationId: string | null) => void;
  onSuccess: (sessionId: string) => void;
  onError: (error: unknown) => void;
};

export function createExclusiveHomeRecommendationStartRunner() {
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

export async function startHomeRecommendation(workflow: HomeRecommendationStartWorkflow) {
  workflow.setBusyRecommendationId(workflow.recommendation.id);
  try {
    const session = await workflow.createSession({
      title: workflow.recommendation.title,
      mode: 'manual',
      questionIds: workflow.recommendation.questionIds,
    });
    workflow.onSuccess(session.id);
  } catch (error) {
    workflow.setBusyRecommendationId(null);
    workflow.onError(error);
  }
}
