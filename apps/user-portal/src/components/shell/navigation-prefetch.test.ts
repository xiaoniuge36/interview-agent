import { afterEach, expect, it, vi } from 'vitest';
import {
  warmDevelopmentRoute,
  warmNavigationInteraction,
  warmNavigationRoutes,
} from './navigation-prefetch';

function deferred() {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

afterEach(() => vi.unstubAllGlobals());

it('schedules every router prefetch before waiting for development warm-up', async () => {
  const firstWarmup = deferred();
  const events: string[] = [];
  const run = warmNavigationRoutes({
    pathname: '/home',
    targets: [{ href: '/home' }, { href: '/profile' }, { href: '/settings' }],
    prefetched: new Set<string>(),
    prefetch: (href) => events.push(`prefetch:${href}`),
    warmDevelopmentRoute: (href) => {
      events.push(`warm:${href}`);
      return href === '/profile' ? firstWarmup.promise : Promise.resolve();
    },
  });

  const beforeFirstWarmupSettles = [...events];
  firstWarmup.resolve();
  await run;

  expect(beforeFirstWarmupSettles).toEqual([
    'prefetch:/profile',
    'prefetch:/settings',
    'warm:/profile',
    'warm:/settings',
  ]);
});

it('warms routes in parallel and isolates a rejected warm-up', async () => {
  const profile = deferred();
  const settings = deferred();
  const started: string[] = [];
  const run = warmNavigationRoutes({
    pathname: '/home',
    targets: [{ href: '/profile' }, { href: '/settings' }],
    prefetched: new Set<string>(),
    prefetch: () => undefined,
    warmDevelopmentRoute: (href) => {
      started.push(href);
      return href === '/profile' ? profile.promise : settings.promise;
    },
  });

  expect(started).toEqual(['/profile', '/settings']);
  settings.reject(new Error('development warm-up failed'));
  profile.resolve();
  await expect(run).resolves.toBeUndefined();
});

it('skips duplicate, current, and previously prefetched targets', async () => {
  const prefetched = new Set(['/settings']);
  const calls: string[] = [];
  await warmNavigationRoutes({
    pathname: '/home',
    targets: [{ href: '/home' }, { href: '/profile' }, { href: '/profile' }, { href: '/settings' }],
    prefetched,
    prefetch: (href) => calls.push(href),
  });

  expect(calls).toEqual(['/profile']);
  expect(prefetched).toEqual(new Set(['/settings', '/profile']));
});

it('warms one eligible interaction without prefetching the current or duplicate destination', () => {
  const prefetch = vi.fn();
  const prefetched = new Set<string>();
  const nestedCurrentPrefetched = new Set<string>();

  expect(
    warmNavigationInteraction({
      href: '/reports',
      pathname: '/reports/session-1',
      prefetched: nestedCurrentPrefetched,
      prefetch,
    }),
  ).toBe(false);

  expect(
    warmNavigationInteraction({
      href: '/reports',
      pathname: '/home',
      prefetched,
      prefetch,
    }),
  ).toBe(true);
  expect(
    warmNavigationInteraction({
      href: '/home',
      pathname: '/home',
      prefetched,
      prefetch,
    }),
  ).toBe(false);
  expect(
    warmNavigationInteraction({
      href: '/reports',
      pathname: '/home',
      prefetched,
      prefetch,
    }),
  ).toBe(false);
  expect(nestedCurrentPrefetched).toEqual(new Set<string>());
  expect(prefetch).toHaveBeenCalledOnce();
  expect(prefetch).toHaveBeenCalledWith('/reports');
});

it('does not issue production warm fetches or schedule aborted work', async () => {
  const prefetch = vi.fn();
  const warm = vi.fn(() => Promise.resolve());
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  await warmNavigationRoutes({
    pathname: '/home',
    targets: [{ href: '/profile' }],
    prefetched: new Set<string>(),
    prefetch,
  });
  const controller = new AbortController();
  controller.abort();
  await warmNavigationRoutes({
    pathname: '/home',
    targets: [{ href: '/settings' }],
    prefetched: new Set<string>(),
    prefetch,
    warmDevelopmentRoute: warm,
    signal: controller.signal,
  });

  expect(prefetch).toHaveBeenCalledOnce();
  expect(prefetch).toHaveBeenCalledWith('/profile');
  expect(warm).not.toHaveBeenCalled();
  expect(fetchMock).not.toHaveBeenCalled();
});

it('passes AbortSignal to development fetch and absorbs cancellation', async () => {
  const controller = new AbortController();
  const fetchMock = vi.fn(
    (_href: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        );
      }),
  );
  vi.stubGlobal('fetch', fetchMock);

  const run = warmDevelopmentRoute('/profile', controller.signal);
  controller.abort();

  await expect(run).resolves.toBeUndefined();
  expect(fetchMock).toHaveBeenCalledWith('/profile', {
    credentials: 'same-origin',
    signal: controller.signal,
  });
});
