import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  resetDevelopmentWarmupForTests,
  warmNavigationInteraction,
  warmNavigationRoutes,
} from './navigation-prefetch';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetDevelopmentWarmupForTests();
});

function stubDevelopmentFetch() {
  vi.stubEnv('NODE_ENV', 'development');
  const requested: string[] = [];
  const fetchMock = vi.fn((href: string) => {
    requested.push(href);
    return Promise.resolve(new Response(href));
  });
  vi.stubGlobal('fetch', fetchMock);
  return { requested, fetchMock };
}

describe('warmNavigationRoutes', () => {
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
});

describe('warmNavigationRoutes skips ineligible work', () => {
  it('skips duplicate, current, and previously prefetched targets', async () => {
    const prefetched = new Set(['/settings']);
    const calls: string[] = [];
    await warmNavigationRoutes({
      pathname: '/home',
      targets: [
        { href: '/home' },
        { href: '/profile' },
        { href: '/profile' },
        { href: '/settings' },
      ],
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
});

describe('development route warmup compiles routes ahead of clicks', () => {
  it('serially fetches routes in development where router.prefetch is a no-op', async () => {
    const { requested, fetchMock } = stubDevelopmentFetch();

    await warmNavigationRoutes({
      pathname: '/home',
      targets: [{ href: '/questions' }, { href: '/learn' }],
      prefetched: new Set<string>(),
      prefetch: vi.fn(),
    });

    expect(requested).toEqual(['/questions', '/learn']);
    expect(fetchMock).toHaveBeenCalledWith(
      '/questions',
      expect.objectContaining({ credentials: 'same-origin' }),
    );
  });

  it('stops the development warmup once its owner has been disposed', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const controller = new AbortController();
    const fetchMock = vi.fn((href: string) => {
      controller.abort();
      return Promise.resolve(new Response(href));
    });
    vi.stubGlobal('fetch', fetchMock);

    await warmNavigationRoutes({
      pathname: '/home',
      targets: [{ href: '/questions' }, { href: '/learn' }],
      prefetched: new Set<string>(),
      prefetch: vi.fn(),
      signal: controller.signal,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the warmup silent when the development fetch fails', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );

    await expect(
      warmNavigationRoutes({
        pathname: '/home',
        targets: [{ href: '/questions' }],
        prefetched: new Set<string>(),
        prefetch: vi.fn(),
      }),
    ).resolves.toBeUndefined();
  });
});

describe('development route warmup stays scoped', () => {
  it('does not fetch outside development runtimes', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await warmNavigationRoutes({
      pathname: '/home',
      targets: [{ href: '/questions' }],
      prefetched: new Set<string>(),
      prefetch: vi.fn(),
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('deduplicates warmup fetches across concurrently mounted navigations', async () => {
    const { fetchMock } = stubDevelopmentFetch();
    const sharedTargets = [{ href: '/questions' }];

    await warmNavigationRoutes({
      pathname: '/home',
      targets: sharedTargets,
      prefetched: new Set<string>(),
      prefetch: vi.fn(),
    });
    await warmNavigationRoutes({
      pathname: '/home',
      targets: sharedTargets,
      prefetched: new Set<string>(),
      prefetch: vi.fn(),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('warmNavigationInteraction', () => {
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

  it('also fetches the destination in development for on-demand compilation', () => {
    const { requested } = stubDevelopmentFetch();
    const prefetch = vi.fn();

    warmNavigationInteraction({
      href: '/interview',
      pathname: '/home',
      prefetched: new Set<string>(),
      prefetch,
    });

    expect(prefetch).toHaveBeenCalledWith('/interview');
    expect(requested).toEqual(['/interview']);
  });
});
