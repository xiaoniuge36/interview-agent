'use client';

import { useEffect } from 'react';

const ROUTE_CHUNK_RECOVERY_KEY = 'interview-agent:route-chunk-recoveries';
const MAX_STORED_RECOVERIES = 20;
const MAX_NORMALIZED_FAILURE_LENGTH = 180;
const CHUNK_RESOURCE_PATTERN = /\/_next\/static\/chunks\/[^\s'"?]+/i;
const CHUNK_FAILURE_PATTERNS = [
  /chunkloaderror/i,
  /loading chunk .+ failed/i,
  CHUNK_RESOURCE_PATTERN,
  /failed to fetch dynamically imported module/i,
];
type RecoveryLocation = Pick<Location, 'pathname' | 'search'>;
type RecoveryStorage = Pick<Storage, 'getItem' | 'setItem'>;

type RouteChunkRecoveryAttempt = {
  failure: unknown;
  location: RecoveryLocation;
  reload: () => void;
  storage: RecoveryStorage;
};

type SafeRouteChunkRecoveryAttempt = Omit<RouteChunkRecoveryAttempt, 'storage'> & {
  getStorage: () => RecoveryStorage;
};

export function RouteChunkRecovery() {
  useEffect(() => {
    const recover = (failure: unknown) =>
      attemptRouteChunkRecoverySafely({
        failure,
        getStorage: () => window.sessionStorage,
        location: window.location,
        reload: () => window.location.reload(),
      });
    const onError = (event: ErrorEvent) =>
      recover(event.error ?? `${event.message} ${event.filename}`);
    const onUnhandledRejection = (event: PromiseRejectionEvent) => recover(event.reason);

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);
  return null;
}

export function attemptRouteChunkRecovery(input: RouteChunkRecoveryAttempt): boolean {
  const key = routeChunkFailureKey(input.failure, input.location);
  if (!key) return false;
  const storedKeys = readRecoveryKeys(input.storage);
  if (!storedKeys || storedKeys.has(key)) return false;

  storedKeys.add(key);
  if (!writeRecoveryKeys(input.storage, storedKeys)) return false;
  try {
    input.reload();
  } catch {
    return false;
  }
  return true;
}

export function attemptRouteChunkRecoverySafely(
  input: SafeRouteChunkRecoveryAttempt,
): boolean {
  try {
    return attemptRouteChunkRecovery({
      failure: input.failure,
      location: input.location,
      reload: input.reload,
      storage: input.getStorage(),
    });
  } catch {
    return false;
  }
}

export function isRouteChunkFailure(failure: unknown): boolean {
  const message = failureMessage(failure);
  return CHUNK_FAILURE_PATTERNS.some((pattern) => pattern.test(message));
}

export function routeChunkFailureKey(
  failure: unknown,
  location: RecoveryLocation,
): string | null {
  if (!isRouteChunkFailure(failure)) return null;
  const message = failureMessage(failure);
  const resource = message.match(CHUNK_RESOURCE_PATTERN)?.[0] ?? normalizedFailure(message);
  return `${location.pathname}${location.search}|${resource}`;
}

function failureMessage(failure: unknown): string {
  if (typeof failure === 'string') return failure;
  if (failure instanceof Error) return `${failure.name}: ${failure.message}`;
  if (failure && typeof failure === 'object' && 'message' in failure)
    return String(failure.message);
  return '';
}

function normalizedFailure(message: string): string {
  return message
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, MAX_NORMALIZED_FAILURE_LENGTH)
    .toLowerCase();
}

function readRecoveryKeys(storage: RecoveryStorage): Set<string> | null {
  try {
    const parsed = JSON.parse(storage.getItem(ROUTE_CHUNK_RECOVERY_KEY) ?? '[]');
    return new Set(Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : []);
  } catch {
    return null;
  }
}

function writeRecoveryKeys(storage: RecoveryStorage, keys: Set<string>): boolean {
  try {
    storage.setItem(
      ROUTE_CHUNK_RECOVERY_KEY,
      JSON.stringify(Array.from(keys).slice(-MAX_STORED_RECOVERIES)),
    );
    return true;
  } catch {
    return false;
  }
}
