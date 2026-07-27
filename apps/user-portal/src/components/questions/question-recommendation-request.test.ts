import { expect, it, vi } from 'vitest';
import { createLatestQuestionRecommendationRequest } from './question-recommendation-request';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

it('only publishes the latest recommendation response', async () => {
  const older = deferred<string[]>();
  const latest = deferred<string[]>();
  const onSuccess = vi.fn();
  const request = createLatestQuestionRecommendationRequest<string>();
  const olderRun = request.load({
    load: () => older.promise,
    onError: vi.fn(),
    onSettled: vi.fn(),
    onSuccess,
  });
  const latestRun = request.load({
    load: () => latest.promise,
    onError: vi.fn(),
    onSettled: vi.fn(),
    onSuccess,
  });

  latest.resolve(['latest']);
  older.resolve(['older']);
  await Promise.all([olderRun, latestRun]);

  expect(onSuccess).toHaveBeenCalledOnce();
  expect(onSuccess).toHaveBeenCalledWith('latest');
});

it('publishes null for an empty current response and nothing after invalidation', async () => {
  const onSuccess = vi.fn();
  const request = createLatestQuestionRecommendationRequest<string>();

  await request.load({
    load: () => Promise.resolve([]),
    onError: vi.fn(),
    onSettled: vi.fn(),
    onSuccess,
  });

  expect(onSuccess).toHaveBeenCalledWith(null);

  const pending = deferred<string[]>();
  const stale = request.load({
    load: () => pending.promise,
    onError: vi.fn(),
    onSettled: vi.fn(),
    onSuccess,
  });
  request.invalidate();
  pending.resolve(['stale']);
  await stale;

  expect(onSuccess).toHaveBeenCalledTimes(1);
});
