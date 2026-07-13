import type { MessageEvent } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AgentStreamEvent } from '@interview-agent/contracts';
import type { PrismaService } from '../database/prisma.service';
import type { RedisService } from '../redis/redis.service';
import { InterviewEventBus } from './interview-event.bus';

const IDLE_TTL_MS = 30_000;

type RedisListener = (payload: string) => void;

const event = (sequence: number): AgentStreamEvent => ({
  type: 'stage_changed',
  eventId: `event-${sequence}`,
  sessionId: 'session-1',
  commandId: 'command-1',
  sequence,
  stage: 'warmup',
  occurredAt: '2026-07-10T08:00:00.000Z',
  traceId: 'trace-test-0001',
});

const record = (sequence: number): Prisma.InterviewEventGetPayload<object> => ({
  id: `event-${sequence}`,
  tenantId: 'tenant-a',
  sessionId: 'session-1',
  commandId: 'command-1',
  sequence,
  type: 'stage_changed',
  payload: { stage: 'warmup' },
  traceId: 'trace-test-0001',
  occurredAt: new Date('2026-07-10T08:00:00.000Z'),
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function setup(records: Promise<Prisma.InterviewEventGetPayload<object>[]>) {
  let listener: RedisListener | undefined;
  const prisma = { interviewEvent: { findMany: jest.fn(() => records) } };
  const redis = {
    subscribe: jest.fn(async (_key: string, next: RedisListener) => {
      listener = next;
      return true;
    }),
    unsubscribe: jest.fn(async () => undefined),
    publish: jest.fn(async () => undefined),
  };
  const bus = new InterviewEventBus(
    prisma as unknown as PrismaService,
    redis as unknown as RedisService,
  );
  return { bus, prisma, redis, listener: () => listener };
}

async function flushAsync() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('InterviewEventBus', () => {
  afterEach(() => jest.useRealTimers());

  it('deduplicates the database replay and live-event race by sequence', async () => {
    const query = deferred<Prisma.InterviewEventGetPayload<object>[]>();
    const { bus, listener } = setup(query.promise);
    const received: MessageEvent[] = [];
    const subscription = bus.stream('tenant-a', 'session-1', 0).subscribe((value) => {
      if (value.type !== 'heartbeat') received.push(value);
    });
    await flushAsync();

    listener()?.(JSON.stringify(event(2)));
    query.resolve([record(1), record(2)]);
    await flushAsync();

    expect(received.map((item) => (item.data as AgentStreamEvent).sequence)).toEqual([1, 2]);
    subscription.unsubscribe();
  });

  it('ignores malformed or cross-session Redis payloads', async () => {
    const { bus, listener } = setup(Promise.resolve([]));
    const received: MessageEvent[] = [];
    const subscription = bus.stream('tenant-a', 'session-1', 0).subscribe((value) => {
      if (value.type !== 'heartbeat') received.push(value);
    });
    await flushAsync();

    listener()?.('not-json');
    listener()?.(JSON.stringify({ ...event(1), sessionId: 'session-2' }));
    await flushAsync();

    expect(received).toEqual([]);
    subscription.unsubscribe();
  });

  it('unsubscribes and releases an idle channel', async () => {
    jest.useFakeTimers();
    const { bus, redis } = setup(Promise.resolve([]));
    const subscription = bus.stream('tenant-a', 'session-1', 0).subscribe();
    await flushAsync();
    subscription.unsubscribe();

    await jest.advanceTimersByTimeAsync(IDLE_TTL_MS);

    expect(redis.unsubscribe).toHaveBeenCalledWith('interview-events:tenant-a:session-1');
    const channels = (bus as unknown as { channels: Map<string, unknown> }).channels;
    expect(channels.size).toBe(0);
  });
});
