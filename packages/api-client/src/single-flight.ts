/**
 * 在途请求共享（single-flight）：并发调用共享同一个 Promise，
 * 结算后立即失效，下次调用重新发起请求——只去重、不缓存，无数据过期问题。
 * 适合首页/复盘这类多个组件同时挂载、各自拉取同一份列表的场景。
 */
export function shareInFlight<TValue>(load: () => Promise<TValue>): () => Promise<TValue> {
  let pending: Promise<TValue> | null = null;
  return () => {
    pending ??= load().finally(() => {
      pending = null;
    });
    return pending;
  };
}
