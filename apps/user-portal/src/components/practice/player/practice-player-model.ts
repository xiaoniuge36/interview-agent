import type { PracticeSession } from '@interview-agent/contracts';

export function initialPracticeItemIndex(session: PracticeSession) {
  const pendingIndex = session.items.findIndex((item) => !item.evaluation);
  return pendingIndex >= 0 ? pendingIndex : 0;
}

export function practiceProgress(session: PracticeSession) {
  return {
    answered: session.items.filter((item) => item.answer).length,
    evaluated: session.items.filter((item) => item.evaluation).length,
    total: session.items.length,
  };
}

export function canCompleteSelfStudy(session: PracticeSession) {
  return session.items.length > 0 && session.items.every((item) => Boolean(item.answer));
}

export function canSubmitAiReport(session: PracticeSession) {
  return session.items.length > 0 && session.items.every((item) => Boolean(item.evaluation));
}
