import { expect, it } from 'vitest';
import { createLatestRequestRunner } from './latest-request';

type Deferred<TValue> = {
  promise: Promise<TValue>;
  resolve: (value: TValue) => void;
  reject: (reason: unknown) => void;
};

function createDeferred<TValue>(): Deferred<TValue> {
  let resolve!: (value: TValue) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<TValue>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
}

it('delivers success callbacks for the latest request', async () => {
  const runner = createLatestRequestRunner();
  const events: string[] = [];
  const accepted = await runner.run({
    load: () => Promise.resolve('第一份数据'),
    onSuccess: (value) => events.push(`success:${value}`),
    onError: () => events.push('error'),
    onSettled: () => events.push('settled'),
  });
  expect(accepted).toBe(true);
  expect(events).toEqual(['success:第一份数据', 'settled']);
});

it('ignores results from a request that has been superseded', async () => {
  const runner = createLatestRequestRunner();
  const first = createDeferred<string>();
  const events: string[] = [];
  const firstRun = runner.run({
    load: () => first.promise,
    onSuccess: (value) => events.push(`stale:${value}`),
    onError: () => events.push('stale-error'),
    onSettled: () => events.push('stale-settled'),
  });
  const secondRun = runner.run({
    load: () => Promise.resolve('最新数据'),
    onSuccess: (value) => events.push(`fresh:${value}`),
    onError: () => events.push('fresh-error'),
  });
  first.resolve('过期数据');
  await expect(firstRun).resolves.toBe(false);
  await expect(secondRun).resolves.toBe(true);
  expect(events).toEqual(['fresh:最新数据']);
});

it('aborts the in-flight signal when a new request starts', async () => {
  const runner = createLatestRequestRunner();
  const first = createDeferred<string>();
  let observedSignal: AbortSignal | undefined;
  const firstRun = runner.run({
    load: (signal) => {
      observedSignal = signal;
      return first.promise;
    },
    onSuccess: () => undefined,
    onError: () => undefined,
  });
  await runner.run({
    load: () => Promise.resolve('ok'),
    onSuccess: () => undefined,
    onError: () => undefined,
  });
  expect(observedSignal?.aborted).toBe(true);
  first.reject(new Error('aborted'));
  await expect(firstRun).resolves.toBe(false);
});

it('drops error callbacks after invalidate', async () => {
  const runner = createLatestRequestRunner();
  const pending = createDeferred<string>();
  const events: string[] = [];
  const runPromise = runner.run({
    load: () => pending.promise,
    onSuccess: () => events.push('success'),
    onError: () => events.push('error'),
    onSettled: () => events.push('settled'),
  });
  runner.invalidate();
  pending.reject(new Error('加载失败'));
  await expect(runPromise).resolves.toBe(false);
  expect(events).toEqual([]);
});

it('reports errors for the latest request', async () => {
  const runner = createLatestRequestRunner();
  const reasons: unknown[] = [];
  const accepted = await runner.run({
    load: () => Promise.reject(new Error('网络异常')),
    onSuccess: () => undefined,
    onError: (reason) => reasons.push(reason),
  });
  expect(accepted).toBe(false);
  expect(reasons).toHaveLength(1);
  expect((reasons[0] as Error).message).toBe('网络异常');
});
