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

export function pendingEvaluationCount(session: PracticeSession) {
  return session.items.filter((item) => Boolean(item.answer) && !item.evaluation).length;
}

export function confirmAiReportSubmission(
  session: PracticeSession,
  confirm: (message: string) => boolean,
) {
  const pendingCount = pendingEvaluationCount(session);
  if (!pendingCount) return true;
  return confirm(
    `本轮还有 ${pendingCount} 道题未完成 AI 评价。继续后将自动调用 AI 评价并生成整轮复盘，可能消耗模型额度，是否继续？`,
  );
}

export function canSubmitAiReport(session: PracticeSession) {
  return canCompleteSelfStudy(session);
}
