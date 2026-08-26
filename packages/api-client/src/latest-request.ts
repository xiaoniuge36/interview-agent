export type LatestRequestHandlers<TValue> = {
  load: (signal: AbortSignal) => Promise<TValue>;
  onSuccess: (value: TValue) => void;
  onError: (reason: unknown) => void;
  onSettled?: () => void;
};

export type LatestRequestRunner = {
  /** 使当前在途请求过期：其结果与回调都会被丢弃。 */
  invalidate: () => void;
  /** 执行请求；仅当本次仍是最新请求时回调并返回 true。 */
  run: <TValue>(handlers: LatestRequestHandlers<TValue>) => Promise<boolean>;
};

/**
 * “最新请求”竞态守卫：旧请求被新请求或 invalidate() 取代后，
 * 其成功/失败结果一律忽略，避免过期数据覆盖新状态。
 */
export function createLatestRequestRunner(): LatestRequestRunner {
  let latestSequence = 0;
  let activeController: AbortController | null = null;

  const invalidate = (): void => {
    latestSequence += 1;
    activeController?.abort();
    activeController = null;
  };

  const run = async <TValue>(handlers: LatestRequestHandlers<TValue>): Promise<boolean> => {
    latestSequence += 1;
    const sequence = latestSequence;
    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;
    const isCurrent = (): boolean => sequence === latestSequence && !controller.signal.aborted;
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
        handlers.onSettled?.();
      }
    }
  };

  return { invalidate, run };
}
