export function createExclusiveInterviewActionRunner() {
  let running = false;
  return async function run(action: () => Promise<void>): Promise<boolean> {
    if (running) return false;
    running = true;
    try {
      await action();
      return true;
    } finally {
      running = false;
    }
  };
}
