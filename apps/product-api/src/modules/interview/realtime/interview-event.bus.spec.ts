import type { MessageEvent } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AgentStreamEvent } from '@interview-agent/contracts';
import type { PrismaService } from '../../../common/database/prisma.service';
import type { RedisService } from '../../../common/redis/redis.service';
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

function expectBatchQuery(findMany: jest.Mock, batch: { call: number; afterSequence: number }) {
  expect(findMany).toHaveBeenNthCalledWith(
    batch.call,
    expect.objectContaining({
      where: expect.objectContaining({ sequence: { gt: batch.afterSequence } }),
      take: 500,
    }),
  );
}

afterEach(() => jest.useRealTimers());

describe('InterviewEventBus streaming', () => {
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

describe('InterviewEventBus batching', () => {
  it('replays long histories in bounded batches while preserving sequence order', async () => {
    const { bus, prisma } = setup(Promise.resolve([]));
    const fullBatch = Array.from({ length: 500 }, (_, index) => record(index + 1));
    prisma.interviewEvent.findMany
      .mockResolvedValueOnce(fullBatch)
      .mockResolvedValueOnce([record(501)]);
    const received: MessageEvent[] = [];
    const subscription = bus.stream('tenant-a', 'session-1', 0).subscribe((value) => {
      if (value.type !== 'heartbeat') received.push(value);
    });
    await flushAsync();
    await flushAsync();

    expect(prisma.interviewEvent.findMany).toHaveBeenCalledTimes(2);
    expectBatchQuery(prisma.interviewEvent.findMany, { call: 1, afterSequence: 0 });
    expectBatchQuery(prisma.interviewEvent.findMany, { call: 2, afterSequence: 500 });
    expect(received).toHaveLength(501);
    expect((received[0]?.data as AgentStreamEvent).sequence).toBe(1);
    expect((received.at(-1)?.data as AgentStreamEvent).sequence).toBe(501);
    subscription.unsubscribe();
  });

  it('dispatches batched publishes concurrently instead of serially awaiting each one', async () => {
    const { bus, redis } = setup(Promise.resolve([]));
    const releases: Array<() => void> = [];
    redis.publish.mockImplementation(
      () =>
        new Promise<undefined>((resolve) => {
          releases.push(() => resolve(undefined));
        }),
    );
    const completed = jest.fn();
    void bus.publishMany({ tenantId: 'tenant-a', events: [event(1), event(2)] }).then(completed);
    await flushAsync();

    expect(redis.publish).toHaveBeenCalledTimes(2);
    expect(completed).not.toHaveBeenCalled();

    for (const release of releases) release();
    await flushAsync();
    await flushAsync();
    expect(completed).toHaveBeenCalled();
  });
});
