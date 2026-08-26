import { createLatestRequestRunner } from '@interview-agent/api-client';

type RecommendationRequestHandlers<T> = {
  load: () => Promise<T[]>;
  onSuccess: (value: T | null) => void;
  onError: (reason: unknown) => void;
  onSettled: () => void;
};

export function createLatestQuestionRecommendationRequest<T>() {
  const runner = createLatestRequestRunner();
  const load = (handlers: RecommendationRequestHandlers<T>) =>
    runner.run({
      load: handlers.load,
      onError: handlers.onError,
      onSettled: handlers.onSettled,
      onSuccess: (items) => handlers.onSuccess(items[0] ?? null),
    });
  return { invalidate: runner.invalidate, load };
}
