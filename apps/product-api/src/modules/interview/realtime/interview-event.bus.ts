import { Injectable, Logger } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { AgentStreamEventSchema, type AgentStreamEvent } from '@interview-agent/contracts';
import { Observable, Subject } from 'rxjs';
import { PrismaService } from '../../../common/database/prisma.service';
import { RedisService } from '../../../common/redis/redis.service';
import { mapEvent } from '../interview.mapper';

const CHANNEL_PREFIX = 'interview-events';
const CHANNEL_IDLE_TTL_MS = 30_000;
const HEARTBEAT_INTERVAL_MS = 15_000;
const CLIENT_RETRY_MS = 2_000;

type ChannelState = {
  key: string;
  subject: Subject<AgentStreamEvent>;
  references: number;
  redisSubscribed: boolean;
  subscribePromise: Promise<void> | undefined;
  idleTimer: NodeJS.Timeout | undefined;
};

type PublishEventsInput = {
  tenantId: string;
  events: AgentStreamEvent[];
};

@Injectable()
export class InterviewEventBus {
  private readonly logger = new Logger(InterviewEventBus.name);
  private readonly channels = new Map<string, ChannelState>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async publishMany(input: PublishEventsInput) {
    for (const event of input.events) {
      await this.publish(input.tenantId, event);
    }
  }

  stream(tenantId: string, sessionId: string, afterSequence: number): Observable<MessageEvent> {
    const key = channelKey(tenantId, sessionId);
    return new Observable<MessageEvent>((subscriber) => {
      const state = this.acquire(key);
      const buffered: AgentStreamEvent[] = [];
      let replaying = true;
      let active = true;
      let lastSequence = afterSequence;
      const live = state.subject.subscribe((event) => {
        if (event.sequence <= afterSequence) return;
        if (replaying) buffered.push(event);
        else lastSequence = emitEvent(subscriber, event, lastSequence);
      });
      const heartbeat = this.startHeartbeat(subscriber);
      void this.initializeStream({
        tenantId,
        sessionId,
        afterSequence,
        state,
        buffered,
        subscriber,
        isActive: () => active,
        getLastSequence: () => lastSequence,
        setLastSequence: (value) => {
          lastSequence = value;
        },
        finishReplay: () => {
          replaying = false;
        },
      });
      return () => {
        active = false;
        clearInterval(heartbeat);
        live.unsubscribe();
        this.release(state);
      };
    });
  }

  private async publish(tenantId: string, event: AgentStreamEvent) {
    const key = channelKey(tenantId, event.sessionId);
    this.channels.get(key)?.subject.next(event);
    try {
      await this.redis.publish(key, JSON.stringify(event));
    } catch (error) {
      this.logger.warn(`Redis publish failed channel=${key}: ${errorMessage(error)}`);
    }
  }

  private async initializeStream(input: {
    tenantId: string;
    sessionId: string;
    afterSequence: number;
    state: ChannelState;
    buffered: AgentStreamEvent[];
    subscriber: import('rxjs').Subscriber<MessageEvent>;
    isActive: () => boolean;
    getLastSequence: () => number;
    setLastSequence: (value: number) => void;
    finishReplay: () => void;
  }) {
    try {
      await this.ensureRedisSubscription(input.state);
      const records = await this.prisma.interviewEvent.findMany({
        where: {
          tenantId: input.tenantId,
          sessionId: input.sessionId,
          sequence: { gt: input.afterSequence },
        },
        orderBy: { sequence: 'asc' },
      });
      if (!input.isActive()) return;
      const pending = [...records.map(mapEvent), ...input.buffered].sort(
        (left, right) => left.sequence - right.sequence,
      );
      let sequence = input.getLastSequence();
      for (const event of pending) sequence = emitEvent(input.subscriber, event, sequence);
      input.setLastSequence(sequence);
      input.finishReplay();
    } catch (error) {
      if (input.isActive()) input.subscriber.error(error);
    }
  }

  private acquire(key: string) {
    const state = this.channels.get(key) ?? this.createChannel(key);
    state.references += 1;
    if (state.idleTimer) clearTimeout(state.idleTimer);
    state.idleTimer = undefined;
    return state;
  }

  private createChannel(key: string): ChannelState {
    const state: ChannelState = {
      key,
      subject: new Subject<AgentStreamEvent>(),
      references: 0,
      redisSubscribed: false,
      subscribePromise: undefined,
      idleTimer: undefined,
    };
    this.channels.set(key, state);
    return state;
  }

  private release(state: ChannelState) {
    state.references = Math.max(0, state.references - 1);
    if (state.references > 0 || state.idleTimer) return;
    state.idleTimer = setTimeout(() => void this.cleanup(state), CHANNEL_IDLE_TTL_MS);
    state.idleTimer.unref();
  }

  private async cleanup(state: ChannelState) {
    state.idleTimer = undefined;
    if (state.references > 0) return;
    try {
      if (state.redisSubscribed) await this.redis.unsubscribe(state.key);
    } catch (error) {
      this.logger.warn(`Redis unsubscribe failed channel=${state.key}: ${errorMessage(error)}`);
    }
    state.redisSubscribed = false;
    if (state.references > 0) {
      void this.ensureRedisSubscription(state);
      return;
    }
    if (this.channels.get(state.key) === state) this.channels.delete(state.key);
    state.subject.complete();
  }

  private async ensureRedisSubscription(state: ChannelState) {
    if (state.redisSubscribed) return;
    if (state.subscribePromise) return state.subscribePromise;
    state.subscribePromise = this.subscribeRedis(state);
    try {
      await state.subscribePromise;
    } finally {
      state.subscribePromise = undefined;
    }
  }

  private async subscribeRedis(state: ChannelState) {
    state.redisSubscribed = await this.redis.subscribe(state.key, (payload) => {
      const parsed = AgentStreamEventSchema.safeParse(safeJson(payload));
      if (parsed.success && state.key.endsWith(`:${parsed.data.sessionId}`)) {
        state.subject.next(parsed.data);
        return;
      }
      this.logger.warn(`Ignored invalid Redis interview event channel=${state.key}`);
    });
  }

  private startHeartbeat(subscriber: import('rxjs').Subscriber<MessageEvent>) {
    const timer = setInterval(() => {
      subscriber.next({ type: 'heartbeat', data: { timestamp: new Date().toISOString() } });
    }, HEARTBEAT_INTERVAL_MS);
    timer.unref();
    return timer;
  }
}

function emitEvent(
  subscriber: import('rxjs').Subscriber<MessageEvent>,
  event: AgentStreamEvent,
  lastSequence: number,
) {
  if (event.sequence <= lastSequence) return lastSequence;
  subscriber.next({ id: event.eventId, type: event.type, retry: CLIENT_RETRY_MS, data: event });
  return event.sequence;
}

function channelKey(tenantId: string, sessionId: string) {
  return `${CHANNEL_PREFIX}:${tenantId}:${sessionId}`;
}

function safeJson(payload: string): unknown {
  try {
    return JSON.parse(payload);
  } catch {
    return undefined;
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'unknown error';
}
