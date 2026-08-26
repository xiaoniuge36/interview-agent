import { Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import { ThrottlerStorageService, type ThrottlerStorage } from '@nestjs/throttler';
import { RedisService } from './redis.service';

type ThrottlerStorageRecord = Awaited<ReturnType<ThrottlerStorage['increment']>>;

const MILLISECONDS_PER_SECOND = 1_000;
const HIT_KEY_PREFIX = 'throttler:hits:';
const BLOCK_KEY_PREFIX = 'throttler:block:';

/**
 * Atomically increments the hit counter, refreshes its window, and manages the
 * block marker in a single Redis round-trip. Returns [totalHits, hitWindowPttl,
 * blockPttl] with PTTLs in milliseconds (block PTTL is 0 when not blocked).
 */
const INCREMENT_SCRIPT = `
local totalHits = redis.call('INCR', KEYS[1])
local timeToExpire = redis.call('PTTL', KEYS[1])
if timeToExpire <= 0 then
  redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[1]))
  timeToExpire = tonumber(ARGV[1])
end
local timeToBlockExpire = 0
if redis.call('EXISTS', KEYS[2]) == 1 then
  timeToBlockExpire = redis.call('PTTL', KEYS[2])
elseif totalHits > tonumber(ARGV[2]) then
  redis.call('SET', KEYS[2], '1', 'PX', ARGV[3])
  timeToBlockExpire = tonumber(ARGV[3])
end
return { totalHits, timeToExpire, timeToBlockExpire }
`;

type IncrementArgs = Parameters<ThrottlerStorage['increment']>;

type RedisIncrementInput = {
  key: string;
  ttl: number;
  limit: number;
  blockDuration: number;
};

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage, OnApplicationShutdown {
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  private readonly memoryFallback = new ThrottlerStorageService();
  private fallbackWarned = false;

  constructor(private readonly redis: RedisService) {}

  async increment(...args: IncrementArgs): Promise<ThrottlerStorageRecord> {
    const [key, ttl, limit, blockDuration, throttlerName] = args;
    try {
      return await this.incrementInRedis({
        key: `${throttlerName}:${key}`,
        ttl,
        limit,
        blockDuration,
      });
    } catch (error) {
      this.warnFallbackOnce(error);
      return this.memoryFallback.increment(key, ttl, limit, blockDuration, throttlerName);
    }
  }

  onApplicationShutdown() {
    this.memoryFallback.onApplicationShutdown();
  }

  private async incrementInRedis(input: RedisIncrementInput): Promise<ThrottlerStorageRecord> {
    const reply = (await this.redis.eval(
      INCREMENT_SCRIPT,
      [HIT_KEY_PREFIX + input.key, BLOCK_KEY_PREFIX + input.key],
      [String(input.ttl), String(input.limit), String(input.blockDuration)],
    )) as [number, number, number];
    const [totalHits, hitWindowMs, blockMs] = reply;
    return {
      totalHits,
      timeToExpire: millisecondsToSeconds(hitWindowMs),
      isBlocked: blockMs > 0,
      timeToBlockExpire: millisecondsToSeconds(blockMs),
    };
  }

  private warnFallbackOnce(error: unknown) {
    if (this.fallbackWarned) return;
    this.fallbackWarned = true;
    const message = error instanceof Error ? error.message : 'unknown error';
    this.logger.warn(
      `Redis throttler storage unavailable; falling back to in-memory rate limits: ${message}`,
    );
  }
}

function millisecondsToSeconds(value: number): number {
  return Math.ceil(value / MILLISECONDS_PER_SECOND);
}
