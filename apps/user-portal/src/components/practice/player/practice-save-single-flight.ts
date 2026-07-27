export function createExclusivePracticeSaveRunner() {
  let running = false;
  return async function run(action: () => Promise<boolean>): Promise<boolean> {
    if (running) return false;
    running = true;
    try {
      return await action();
    } finally {
      running = false;
    }
  };
}
