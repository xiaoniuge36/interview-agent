type PendingAnswer = {
  resolve: (value: string) => void;
  reject: (reason: unknown) => void;
  signal: AbortSignal | undefined;
  onAbort?: () => void;
};

export function createPendingAnswerManager(onQuestionChange: (question: string | null) => void) {
  let pending: PendingAnswer | null = null;
  const clear = (entry: PendingAnswer) => {
    if (pending !== entry) return false;
    entry.signal?.removeEventListener('abort', entry.onAbort ?? noop);
    pending = null;
    onQuestionChange(null);
    return true;
  };
  const cancelEntry = (entry: PendingAnswer, reason: unknown) => {
    if (!clear(entry)) return;
    entry.reject(reason);
  };
  const cancel = (reason: unknown) => {
    if (pending) cancelEntry(pending, reason);
  };
  const answer = (value: string) => {
    const entry = pending;
    if (!entry || !clear(entry)) return;
    entry.resolve(value);
  };
  const ask = (question: string, options?: { signal?: AbortSignal }) => {
    cancel(new Error('上一条确认已取消。'));
    return new Promise<string>((resolve, reject) => {
      const entry: PendingAnswer = { resolve, reject, signal: options?.signal };
      entry.onAbort = () => cancelEntry(entry, entry.signal?.reason ?? new Error('确认已取消。'));
      pending = entry;
      onQuestionChange(question);
      if (entry.signal?.aborted) entry.onAbort();
      else entry.signal?.addEventListener('abort', entry.onAbort, { once: true });
    });
  };
  return { answer, ask, cancel };
}

function noop() {}
