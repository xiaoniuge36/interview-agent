import { Logger } from '@nestjs/common';
import type { RedisService } from './redis.service';
import { RedisThrottlerStorage } from './redis-throttler.storage';

const TTL_MS = 60_000;
const LIMIT = 10;
const BLOCK_MS = 30_000;

let warnSpy: jest.SpyInstance;

beforeEach(() => {
  warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  warnSpy.mockRestore();
});

function createStorage(evalMock: jest.Mock) {
  const redis = { eval: evalMock };
  return new RedisThrottlerStorage(redis as unknown as RedisService);
}

test('maps the atomic Redis reply into a throttler record', async () => {
  const evalMock = jest.fn().mockResolvedValue([3, TTL_MS, 0]);
  const storage = createStorage(evalMock);

  const record = await storage.increment('user-1', TTL_MS, LIMIT, BLOCK_MS, 'default');

  expect(record).toEqual({
    totalHits: 3,
    timeToExpire: 60,
    isBlocked: false,
    timeToBlockExpire: 0,
  });
  expect(evalMock).toHaveBeenCalledWith(
    expect.stringContaining('INCR'),
    ['throttler:hits:default:user-1', 'throttler:block:default:user-1'],
    [String(TTL_MS), String(LIMIT), String(BLOCK_MS)],
  );
  storage.onApplicationShutdown();
});

test('reports a blocked key with the remaining block window', async () => {
  const evalMock = jest.fn().mockResolvedValue([11, TTL_MS, BLOCK_MS]);
  const storage = createStorage(evalMock);

  const record = await storage.increment('user-1', TTL_MS, LIMIT, BLOCK_MS, 'default');

  expect(record).toEqual({
    totalHits: 11,
    timeToExpire: 60,
    isBlocked: true,
    timeToBlockExpire: 30,
  });
  storage.onApplicationShutdown();
});

test('falls back to in-memory limits and warns only once when Redis is unavailable', async () => {
  const evalMock = jest.fn().mockRejectedValue(new Error('Redis client is not ready'));
  const storage = createStorage(evalMock);

  const first = await storage.increment('user-1', TTL_MS, LIMIT, BLOCK_MS, 'default');
  const second = await storage.increment('user-1', TTL_MS, LIMIT, BLOCK_MS, 'default');

  expect(first.totalHits).toBe(1);
  expect(second.totalHits).toBe(2);
  expect(first.isBlocked).toBe(false);
  expect(warnSpy).toHaveBeenCalledTimes(1);
  expect(warnSpy).toHaveBeenCalledWith(
    expect.stringContaining('falling back to in-memory rate limits'),
  );
  storage.onApplicationShutdown();
});

test('keeps tenants isolated in the fallback store by full throttler key', async () => {
  const evalMock = jest.fn().mockRejectedValue(new Error('down'));
  const storage = createStorage(evalMock);

  const tenantA = await storage.increment('tenant-a:user', TTL_MS, LIMIT, BLOCK_MS, 'default');
  const tenantB = await storage.increment('tenant-b:user', TTL_MS, LIMIT, BLOCK_MS, 'default');

  expect(tenantA.totalHits).toBe(1);
  expect(tenantB.totalHits).toBe(1);
  storage.onApplicationShutdown();
});
