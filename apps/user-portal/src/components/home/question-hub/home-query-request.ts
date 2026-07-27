type LatestHomeQueryHandlers<T> = {
  load: () => Promise<T>;
  onSuccess: (value: T) => void;
  onError: (reason: unknown) => void;
  onSettled: () => void;
};

export function createLatestHomeQueryRequest() {
  let latestSequence = 0;
  const invalidate = () => {
    latestSequence += 1;
  };
  const run = async <T>(handlers: LatestHomeQueryHandlers<T>): Promise<boolean> => {
    const sequence = ++latestSequence;
    try {
      const value = await handlers.load();
      if (sequence !== latestSequence) return false;
      handlers.onSuccess(value);
      return true;
    } catch (reason) {
      if (sequence !== latestSequence) return false;
      handlers.onError(reason);
      return false;
    } finally {
      if (sequence === latestSequence) handlers.onSettled();
    }
  };
  return { invalidate, run };
}
