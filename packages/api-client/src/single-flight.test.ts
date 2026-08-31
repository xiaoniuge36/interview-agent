import { expect, it } from 'vitest';
import { shareInFlight } from './single-flight';

it('shares the in-flight promise across concurrent callers', async () => {
  let calls = 0;
  let release!: (value: string) => void;
  const shared = shareInFlight(
    () =>
      new Promise<string>((resolve) => {
        calls += 1;
        release = resolve;
      }),
  );
  const first = shared();
  const second = shared();
  release('面试列表');
  await expect(first).resolves.toBe('面试列表');
  await expect(second).resolves.toBe('面试列表');
  expect(calls).toBe(1);
});

it('issues a fresh request after the previous one settles', async () => {
  let calls = 0;
  const shared = shareInFlight(() => {
    calls += 1;
    return Promise.resolve(calls);
  });
  await expect(shared()).resolves.toBe(1);
  await expect(shared()).resolves.toBe(2);
});

it('clears the shared promise after a failure so callers can retry', async () => {
  let calls = 0;
  const shared = shareInFlight(() => {
    calls += 1;
    return calls === 1 ? Promise.reject(new Error('网络异常')) : Promise.resolve('恢复');
  });
  await expect(shared()).rejects.toThrow('网络异常');
  await expect(shared()).resolves.toBe('恢复');
  expect(calls).toBe(2);
});

it('propagates the same rejection to every concurrent caller', async () => {
  let reject!: (reason: unknown) => void;
  const shared = shareInFlight(
    () =>
      new Promise<never>((_, innerReject) => {
        reject = innerReject;
      }),
  );
  const first = shared();
  const second = shared();
  reject(new Error('服务不可用'));
  await expect(first).rejects.toThrow('服务不可用');
  await expect(second).rejects.toThrow('服务不可用');
});
