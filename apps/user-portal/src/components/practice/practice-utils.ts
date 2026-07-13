import type { PracticeSession } from '@interview-agent/contracts';

export function answerDrafts(session: PracticeSession) {
  return Object.fromEntries(session.items.map((item) => [item.id, item.answer ?? '']));
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The operation failed. Please try again.';
}
