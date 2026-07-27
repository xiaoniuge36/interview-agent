import { expect, it } from 'vitest';
import { createSearchRequestLifecycle } from './search-request-lifecycle';

it('marks only the newest search effect as current', () => {
  const lifecycle = createSearchRequestLifecycle();
  const older = lifecycle.next();
  const latest = lifecycle.next();

  expect(lifecycle.isCurrent(older)).toBe(false);
  expect(lifecycle.isCurrent(latest)).toBe(true);
});

it('invalidates the active search and allows the next lifecycle', () => {
  const lifecycle = createSearchRequestLifecycle();
  const previous = lifecycle.next();

  lifecycle.invalidate();
  expect(lifecycle.isCurrent(previous)).toBe(false);

  const next = lifecycle.next();
  expect(lifecycle.isCurrent(next)).toBe(true);
});
