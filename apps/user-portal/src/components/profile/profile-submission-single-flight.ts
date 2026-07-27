type SubmissionHandlers<T> = {
  submit: () => Promise<T>;
  onStart: () => void;
  onSuccess: (value: T) => void;
  onError: (reason: unknown) => void;
  onSettled: () => void;
};

type ActiveSubmission = {
  generation: number;
  promise: Promise<boolean>;
};

export function createExclusiveProfileSubmissionRunner() {
  let generation = 0;
  let active: ActiveSubmission | null = null;
  const invalidate = () => {
    generation += 1;
    active = null;
  };
  const run = <T>(handlers: SubmissionHandlers<T>): Promise<boolean> => {
    if (active?.generation === generation) return active.promise;
    const runGeneration = generation;
    handlers.onStart();
    const execution = executeSubmission(handlers, () => runGeneration === generation).finally(
      () => {
        if (runGeneration !== generation) return;
        active = null;
        handlers.onSettled();
      },
    );
    active = { generation: runGeneration, promise: execution };
    return execution;
  };
  return { invalidate, run };
}

async function executeSubmission<T>(
  handlers: SubmissionHandlers<T>,
  isCurrent: () => boolean,
): Promise<boolean> {
  try {
    const value = await handlers.submit();
    if (!isCurrent()) return false;
    handlers.onSuccess(value);
    return true;
  } catch (reason) {
    if (!isCurrent()) return false;
    handlers.onError(reason);
    return false;
  }
}
