import { expect, it, vi } from 'vitest';
import { createExclusiveProfileSubmissionRunner } from './profile-submission-single-flight';

it('deduplicates synchronous profile submissions and keeps the first handlers', async () => {
  let resolve!: (value: string) => void;
  const pending = new Promise<string>((resolvePromise) => {
    resolve = resolvePromise;
  });
  const submit = vi.fn(() => pending);
  const firstSuccess = vi.fn();
  const runner = createExclusiveProfileSubmissionRunner();
  const first = runner.run({
    onError: vi.fn(),
    onSettled: vi.fn(),
    onStart: vi.fn(),
    onSuccess: firstSuccess,
    submit,
  });
  const duplicateSuccess = vi.fn();
  const duplicate = runner.run({
    onError: vi.fn(),
    onSettled: vi.fn(),
    onStart: vi.fn(),
    onSuccess: duplicateSuccess,
    submit,
  });

  expect(duplicate).toBe(first);
  expect(submit).toHaveBeenCalledOnce();
  resolve('profile');
  await first;

  expect(firstSuccess).toHaveBeenCalledWith('profile');
  expect(duplicateSuccess).not.toHaveBeenCalled();
});
