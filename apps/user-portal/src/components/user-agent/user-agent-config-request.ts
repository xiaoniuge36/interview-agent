type ConfigRequestHandlers<T> = {
  load: (signal: AbortSignal) => Promise<T>;
  onSuccess: (value: T) => void;
  onError: (reason: unknown) => void;
  onSettled: () => void;
};

export function createLatestUserAgentConfigRequest() {
  let latestSequence = 0;
  let activeController: AbortController | null = null;
  const invalidate = () => {
    latestSequence += 1;
    activeController?.abort();
    activeController = null;
  };
  const run = async <T>(handlers: ConfigRequestHandlers<T>): Promise<boolean> => {
    const sequence = ++latestSequence;
    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;
    const isCurrent = () => sequence === latestSequence && !controller.signal.aborted;
    try {
      const value = await handlers.load(controller.signal);
      if (!isCurrent()) return false;
      handlers.onSuccess(value);
      return true;
    } catch (reason) {
      if (!isCurrent()) return false;
      handlers.onError(reason);
      return false;
    } finally {
      if (isCurrent()) {
        activeController = null;
        handlers.onSettled();
      }
    }
  };
  return { invalidate, run };
}
