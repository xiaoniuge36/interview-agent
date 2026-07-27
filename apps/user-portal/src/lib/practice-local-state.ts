export type PracticeLocalStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type PracticeLocalState = {
  drafts: Record<string, string>;
  currentIndex: number | null;
};

type PracticeDraftInput = {
  sessionId: string;
  itemId: string;
  draft: string;
};

const PRACTICE_LOCAL_STATE_KEY_PREFIX = 'offerpilot:practice-local-state:';

export function loadPracticeLocalState(
  sessionId: string,
  storage: PracticeLocalStorage | null = browserSessionStorage(),
): PracticeLocalState {
  try {
    return parsePracticeLocalState(storage?.getItem(storageKey(sessionId)) ?? null);
  } catch {
    return emptyPracticeLocalState();
  }
}

export function savePracticeDraft(
  input: PracticeDraftInput,
  storage: PracticeLocalStorage | null = browserSessionStorage(),
): void {
  const state = loadPracticeLocalState(input.sessionId, storage);
  if (input.draft.trim()) state.drafts[input.itemId] = input.draft;
  else delete state.drafts[input.itemId];
  persistPracticeLocalState(input.sessionId, state, storage);
}

export function savePracticeIndex(
  sessionId: string,
  currentIndex: number,
  storage: PracticeLocalStorage | null = browserSessionStorage(),
): void {
  if (!Number.isInteger(currentIndex) || currentIndex < 0) return;
  const state = loadPracticeLocalState(sessionId, storage);
  state.currentIndex = currentIndex;
  persistPracticeLocalState(sessionId, state, storage);
}

export function clearPracticeDraft(
  sessionId: string,
  itemId: string,
  storage: PracticeLocalStorage | null = browserSessionStorage(),
): void {
  const state = loadPracticeLocalState(sessionId, storage);
  delete state.drafts[itemId];
  persistPracticeLocalState(sessionId, state, storage);
}

export function clearPracticeLocalState(
  sessionId: string,
  storage: PracticeLocalStorage | null = browserSessionStorage(),
): void {
  try {
    storage?.removeItem(storageKey(sessionId));
  } catch {
    // 本地恢复清理失败不应覆盖服务端成功结果。
  }
}

function parsePracticeLocalState(value: string | null): PracticeLocalState {
  if (!value) return emptyPracticeLocalState();
  const parsed: unknown = JSON.parse(value);
  if (!isRecord(parsed)) return emptyPracticeLocalState();
  const draftSource = isRecord(parsed.drafts) ? parsed.drafts : {};
  const drafts = Object.fromEntries(
    Object.entries(draftSource).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === 'string' && Boolean(entry[1].trim()),
    ),
  );
  const currentIndex =
    Number.isInteger(parsed.currentIndex) && Number(parsed.currentIndex) >= 0
      ? Number(parsed.currentIndex)
      : null;
  return { drafts, currentIndex };
}

function persistPracticeLocalState(
  sessionId: string,
  state: PracticeLocalState,
  storage: PracticeLocalStorage | null,
): void {
  if (!storage) return;
  try {
    if (!Object.keys(state.drafts).length && state.currentIndex === null) {
      storage.removeItem(storageKey(sessionId));
      return;
    }
    storage.setItem(storageKey(sessionId), JSON.stringify(state));
  } catch {
    // 本地恢复是尽力而为，不应阻断正常刷题。
  }
}

function browserSessionStorage(): PracticeLocalStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function emptyPracticeLocalState(): PracticeLocalState {
  return { drafts: {}, currentIndex: null };
}

function storageKey(sessionId: string): string {
  return `${PRACTICE_LOCAL_STATE_KEY_PREFIX}${sessionId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
