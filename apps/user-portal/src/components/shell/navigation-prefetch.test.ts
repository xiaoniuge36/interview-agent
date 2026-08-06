import { afterEach, expect, it, vi } from 'vitest';
import { warmNavigationInteraction, warmNavigationRoutes } from './navigation-prefetch';

afterEach(() => vi.unstubAllGlobals());

it('prefetches every eligible route through the Next router', async () => {
  const calls: string[] = [];
  await warmNavigationRoutes({
    pathname: '/home',
    targets: [{ href: '/home' }, { href: '/profile' }, { href: '/settings' }],
    prefetched: new Set<string>(),
    prefetch: (href) => calls.push(href),
  });

  expect(calls).toEqual(['/profile', '/settings']);
});

it('ignores the legacy route fetch hook that produced phantom development chunks', async () => {
  const fetchMock = vi.fn((href: string) => Promise.resolve(new Response(href)));
  const legacyOptions = {
    pathname: '/home',
    targets: [{ href: '/practice' }],
    prefetched: new Set<string>(),
    prefetch: vi.fn(),
    warmDevelopmentRoute: (href: string) => fetchMock(href),
  };

  await warmNavigationRoutes(legacyOptions);

  expect(legacyOptions.prefetch).toHaveBeenCalledWith('/practice');
  expect(fetchMock).not.toHaveBeenCalled();
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

it('does not schedule route work after its owner has been disposed', async () => {
  const prefetch = vi.fn();
  const controller = new AbortController();
  controller.abort();

  await warmNavigationRoutes({
    pathname: '/home',
    targets: [{ href: '/settings' }],
    prefetched: new Set<string>(),
    prefetch,
    signal: controller.signal,
  });

  expect(prefetch).not.toHaveBeenCalled();
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
    warmNavigationInteraction({ href: '/reports', pathname: '/home', prefetched, prefetch }),
  ).toBe(true);
  expect(
    warmNavigationInteraction({ href: '/home', pathname: '/home', prefetched, prefetch }),
  ).toBe(false);
  expect(
    warmNavigationInteraction({ href: '/reports', pathname: '/home', prefetched, prefetch }),
  ).toBe(false);
  expect(nestedCurrentPrefetched).toEqual(new Set<string>());
  expect(prefetch).toHaveBeenCalledOnce();
  expect(prefetch).toHaveBeenCalledWith('/reports');
});
