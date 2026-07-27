type RuntimeCreationInput<T> = {
  create: () => Promise<T>;
  fallbackMessage: string;
  isDisposed: () => boolean;
  onDispose: (runtime: T) => void;
  onError: (message: string) => void;
  onReady: (runtime: T) => void;
};

export async function runRuntimeCreation<T>(input: RuntimeCreationInput<T>): Promise<boolean> {
  try {
    const runtime = await input.create();
    if (input.isDisposed()) {
      input.onDispose(runtime);
      return false;
    }
    input.onReady(runtime);
    return true;
  } catch (reason) {
    if (!input.isDisposed()) {
      input.onError(reason instanceof Error ? reason.message : input.fallbackMessage);
    }
    return false;
  }
}
