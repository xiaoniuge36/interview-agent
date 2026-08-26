import { describe, expect, it, vi } from 'vitest';
import {
  attemptRouteChunkRecovery,
  attemptRouteChunkRecoverySafely,
  isRouteChunkFailure,
  routeChunkFailureKey,
} from './RouteChunkRecovery';

const PRACTICE_CHUNK_FAILURE =
  'ChunkLoadError: Loading chunk /_next/static/chunks/app/(app)/practice/page.js failed.';

describe('route chunk recovery', () => {
  it.each([
    new Error(PRACTICE_CHUNK_FAILURE),
    'Loading chunk 237 failed: /_next/static/chunks/app/practice.js',
    { message: 'Failed to fetch dynamically imported module' },
  ])('recognizes stale route assets', (failure) => {
    expect(isRouteChunkFailure(failure)).toBe(true);
  });

  it('uses the current route and failed resource in the recovery key', () => {
    expect(
      routeChunkFailureKey(PRACTICE_CHUNK_FAILURE, {
        pathname: '/questions',
        search: '?difficulty=intro',
      }),
    ).toBe('/questions?difficulty=intro|/_next/static/chunks/app/(app)/practice/page.js');
  });

  it('reloads at most once for the same route and resource', () => {
    const storage = memoryStorage();
    const reload = vi.fn();
    const attempt = () =>
      attemptRouteChunkRecovery({
        failure: PRACTICE_CHUNK_FAILURE,
        location: { pathname: '/questions', search: '' },
        reload,
        storage,
      });

    expect(attempt()).toBe(true);
    expect(attempt()).toBe(false);
    expect(reload).toHaveBeenCalledOnce();
  });
});

describe('route chunk recovery boundaries', () => {
  it('allows a different target route to recover without clearing the previous marker', () => {
    const storage = memoryStorage();
    const reload = vi.fn();

    expect(recoverAt('/questions', storage, reload)).toBe(true);
    expect(recoverAt('/home', storage, reload)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('does not crash or reload when session storage is unavailable', () => {
    const reload = vi.fn();
    const getStorage = () => {
      throw new Error('blocked');
    };

    expect(
      attemptRouteChunkRecoverySafely({
        failure: PRACTICE_CHUNK_FAILURE,
        getStorage,
        location: { pathname: '/questions', search: '' },
        reload,
      }),
    ).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});

describe('route chunk recovery marker storage', () => {
  it('does not reload when reading the recovery marker fails', () => {
    const reload = vi.fn();
    const storage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: vi.fn(),
    };

    expect(
      attemptRouteChunkRecovery({
        failure: PRACTICE_CHUNK_FAILURE,
        location: { pathname: '/questions', search: '' },
        reload,
        storage,
      }),
    ).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('does not reload when the recovery marker cannot be persisted', () => {
    const reload = vi.fn();
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded');
      },
    };

    expect(
      attemptRouteChunkRecovery({
        failure: PRACTICE_CHUNK_FAILURE,
        location: { pathname: '/questions', search: '' },
        reload,
        storage,
      }),
    ).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});

describe('route chunk recovery filtering', () => {
  it('does not reload for ordinary application errors', () => {
    const reload = vi.fn();
    expect(
      attemptRouteChunkRecovery({
        failure: new Error('保存练习失败'),
        location: { pathname: '/practice', search: '' },
        reload,
        storage: memoryStorage(),
      }),
    ).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});

function recoverAt(
  pathname: string,
  storage: ReturnType<typeof memoryStorage>,
  reload: () => void,
) {
  return attemptRouteChunkRecovery({
    failure: PRACTICE_CHUNK_FAILURE,
    location: { pathname, search: '' },
    reload,
    storage,
  });
}

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
}
