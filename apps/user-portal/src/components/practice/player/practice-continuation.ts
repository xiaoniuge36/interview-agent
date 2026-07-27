import type { createPracticeSession } from '@/lib/practice-api';
import type { getPracticeRecommendations } from '@/lib/question-catalog-api';

type RecommendationWorkflow = {
  loadRecommendations: typeof getPracticeRecommendations;
  createSession: typeof createPracticeSession;
  setStarting: (starting: boolean) => void;
  onSuccess: (sessionId: string) => void;
  onError: (error: unknown) => void;
};

export function createExclusivePracticeContinuationRunner() {
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

export async function startNextRecommendedPractice(workflow: RecommendationWorkflow) {
  workflow.setStarting(true);
  try {
    const recommendation = (await workflow.loadRecommendations())[0];
    if (!recommendation) throw new Error('RECOMMENDATION_UNAVAILABLE');
    const session = await workflow.createSession({
      title: recommendation.title,
      mode: 'manual',
      questionIds: recommendation.questionIds,
    });
    workflow.onSuccess(session.id);
  } catch (error) {
    workflow.setStarting(false);
    workflow.onError(error);
  }
}
