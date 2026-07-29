import type { PracticeSession } from '@interview-agent/contracts';
import type { PracticeLocalState } from '@/lib/practice-local-state';
import { answerDrafts } from '../practice-utils';

export function initialPracticeItemIndex(session: PracticeSession) {
  const pendingIndex = session.items.findIndex((item) => !item.evaluation);
  return pendingIndex >= 0 ? pendingIndex : 0;
}

export function restorePracticeWorkspace(session: PracticeSession, localState: PracticeLocalState) {
  const serverDrafts = answerDrafts(session);
  if (session.status !== 'in_progress') {
    return {
      drafts: serverDrafts,
      currentIndex: initialPracticeItemIndex(session),
      recoveredDraftCount: 0,
    };
  }
  const validDrafts = Object.fromEntries(
    Object.entries(localState.drafts).filter(([itemId, draft]) => {
      const savedAnswer = serverDrafts[itemId];
      return (
        Boolean(draft.trim()) && savedAnswer !== undefined && draft.trim() !== savedAnswer.trim()
      );
    }),
  );
  const localIndex = localState.currentIndex;
  const currentIndex =
    localIndex !== null &&
    Number.isInteger(localIndex) &&
    localIndex >= 0 &&
    localIndex < session.items.length
      ? localIndex
      : initialPracticeItemIndex(session);
  return {
    drafts: { ...serverDrafts, ...validDrafts },
    currentIndex,
    recoveredDraftCount: Object.keys(validDrafts).length,
  };
}

export function practiceRecoveryMessage(recoveredDraftCount: number): string {
  return recoveredDraftCount > 0 ? '已恢复当前标签页内未保存的回答。' : '';
}

export function practiceProgress(session: PracticeSession) {
  return {
    answered: session.items.filter((item) => item.answer).length,
    evaluated: session.items.filter((item) => item.evaluation).length,
    total: session.items.length,
  };
}

export function practiceEvidence(session: PracticeSession) {
  const { answered, evaluated, total } = practiceProgress(session);
  return {
    answered,
    evaluated,
    total,
    pending: Math.max(total - evaluated, 0),
    profileState:
      session.status === 'report_ready'
        ? ('updated' as const)
        : session.status === 'in_progress'
          ? ('awaiting_report' as const)
          : ('preserved' as const),
  };
}

export function canCompleteSelfStudy(session: PracticeSession) {
  return session.items.length > 0 && session.items.every((item) => Boolean(item.answer));
}

export function pendingEvaluationCount(session: PracticeSession) {
  return session.items.filter((item) => Boolean(item.answer) && !item.evaluation).length;
}

export function requiresAiReportConfirmation(session: PracticeSession) {
  return pendingEvaluationCount(session) > 0;
}

export function canSubmitAiReport(session: PracticeSession) {
  return canCompleteSelfStudy(session);
}

export function hasUnsavedPracticeAnswer(item: PracticeSession['items'][number], draft: string) {
  return draft.trim() !== (item.answer?.trim() ?? '');
}

export function confirmPracticeNavigation(item: PracticeSession['items'][number], draft: string) {
  if (!hasUnsavedPracticeAnswer(item, draft)) return null;
  return {
    cancelLabel: '留在本题',
    confirmLabel: '保留草稿并切换',
    description: '当前修改只保存在这个标签页，切换后仍可回来继续编辑。',
    title: '保留这段草稿再切换？',
  };
}
