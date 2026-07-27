import { createInterviewReviewRequest } from './interview-review-practice';

type InterviewReviewPracticeWorkflow = {
  sessionId: string;
  createSession: (
    input: ReturnType<typeof createInterviewReviewRequest>,
  ) => Promise<{ id: string }>;
  onSuccess: (practiceSessionId: string) => void;
  onError: (error: unknown) => void;
};

export function createExclusiveInterviewReviewPracticeRunner() {
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

export async function startInterviewReviewPractice(
  workflow: InterviewReviewPracticeWorkflow,
): Promise<void> {
  try {
    const session = await workflow.createSession(createInterviewReviewRequest(workflow.sessionId));
    workflow.onSuccess(session.id);
  } catch (error) {
    workflow.onError(error);
  }
}
