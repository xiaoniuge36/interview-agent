type ConversationSelectionHandlers<T> = {
  load: () => Promise<T>;
  onSuccess: (value: T) => void;
  onError: (reason: unknown) => void;
  onSettled: () => void;
};

export function createConversationSelectionCleanup(
  selection: ReturnType<typeof createLatestConversationSelectionRunner>,
) {
  return () => {
    selection.invalidate();
  };
}

export function createLatestConversationSelectionRunner() {
  let latestSequence = 0;
  const invalidate = () => {
    latestSequence += 1;
    return latestSequence;
  };
  const isCurrent = (sequence: number) => sequence === latestSequence;
  const run = async <T>(handlers: ConversationSelectionHandlers<T>): Promise<boolean> => {
    const sequence = ++latestSequence;
    try {
      const value = await handlers.load();
      if (!isCurrent(sequence)) return false;
      handlers.onSuccess(value);
      return true;
    } catch (reason) {
      if (!isCurrent(sequence)) return false;
      handlers.onError(reason);
      return false;
    } finally {
      if (isCurrent(sequence)) handlers.onSettled();
    }
  };
  return { invalidate, isCurrent, run };
}
