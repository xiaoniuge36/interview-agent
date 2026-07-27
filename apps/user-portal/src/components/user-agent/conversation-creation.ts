export function createSingleFlightRunner<T>() {
  let pending: Promise<T> | null = null;
  return function run(action: () => Promise<T>): Promise<T> {
    if (pending) return pending;
    try {
      const current = action().finally(() => {
        if (pending === current) pending = null;
      });
      pending = current;
      return current;
    } catch (reason) {
      return Promise.reject(reason);
    }
  };
}
