export type InterviewDraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const INTERVIEW_DRAFT_KEY_PREFIX = 'offerpilot:interview-draft:';

export function loadInterviewDraft(
  sessionId: string,
  storage: InterviewDraftStorage | null = browserSessionStorage(),
): string {
  try {
    return storage?.getItem(draftKey(sessionId)) ?? '';
  } catch {
    return '';
  }
}

export function saveInterviewDraft(
  sessionId: string,
  draft: string,
  storage: InterviewDraftStorage | null = browserSessionStorage(),
): void {
  if (!storage) return;
  try {
    if (!draft.trim()) {
      storage.removeItem(draftKey(sessionId));
      return;
    }
    storage.setItem(draftKey(sessionId), draft);
  } catch {
    // 草稿恢复是尽力而为，不应阻断正常作答。
  }
}

export function clearInterviewDraft(
  sessionId: string,
  storage: InterviewDraftStorage | null = browserSessionStorage(),
): void {
  try {
    storage?.removeItem(draftKey(sessionId));
  } catch {
    // 提交成功后的本地清理失败不应覆盖服务端成功结果。
  }
}

function browserSessionStorage(): InterviewDraftStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function draftKey(sessionId: string): string {
  return `${INTERVIEW_DRAFT_KEY_PREFIX}${sessionId}`;
}
