import type { createPracticeSession } from '@/lib/practice-api';

export type PracticeStartInput = {
  key: string;
  title: string;
  questionIds: string[];
  failureMessage: string;
};

type PracticeStartWorkflow = {
  input: PracticeStartInput;
  createSession: typeof createPracticeSession;
  setBusyKey: (key: string | null) => void;
  onSuccess: (sessionId: string) => void;
  onError: (error: unknown) => void;
};

export function createExclusivePracticeStartRunner() {
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

export async function startQuestionPractice(workflow: PracticeStartWorkflow) {
  workflow.setBusyKey(workflow.input.key);
  try {
    const session = await workflow.createSession({
      title: workflow.input.title,
      mode: 'manual',
      questionIds: workflow.input.questionIds,
    });
    workflow.onSuccess(session.id);
  } catch (error) {
    workflow.setBusyKey(null);
    workflow.onError(error);
  }
}
