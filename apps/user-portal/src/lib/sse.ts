import { AgentStreamEventSchema, type AgentStreamEvent } from '@interview-agent/contracts';
import { z } from 'zod';

const BASE_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 8_000;
const JITTER_RATIO = 0.2;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const STREAM_PROTOCOL_ERROR_MESSAGE = '实时数据暂时异常，请稍后重新开始本场训练。';
const TERMINAL_STATUSES = new Set([
  HTTP_BAD_REQUEST,
  HTTP_UNAUTHORIZED,
  HTTP_FORBIDDEN,
  HTTP_NOT_FOUND,
]);
const HeartbeatSchema = z.object({ timestamp: z.string().datetime() });

type SseField = {
  name: string;
  value: string;
};

type MutableSseFrame = {
  event: string;
  data: string[];
  id?: string;
  retry?: number;
};

export type SseFrame = {
  event: string;
  data: string;
  id?: string;
  retry?: number;
};

export type ParsedStreamFrame = { kind: 'heartbeat' } | { kind: 'event'; event: AgentStreamEvent };

export class SseProtocolError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SseProtocolError';
  }
}

export function extractSseFrames(buffer: string): {
  frames: string[];
  remainder: string;
} {
  const normalized = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const parts = normalized.split('\n\n');
  return { frames: parts.slice(0, -1), remainder: parts.at(-1) ?? '' };
}

export function parseSseFrame(rawFrame: string): SseFrame {
  const frame: MutableSseFrame = { event: 'message', data: [] };
  for (const line of rawFrame.split('\n')) {
    const field = parseField(line);
    if (field) applyField(frame, field);
  }
  if (frame.data.length === 0) {
    throw new SseProtocolError(STREAM_PROTOCOL_ERROR_MESSAGE);
  }
  return finalizeFrame(frame);
}

export function parseStreamFrame(rawFrame: string): ParsedStreamFrame {
  const frame = parseSseFrame(rawFrame);
  const payload = parseJson(frame.data);
  if (frame.event === 'heartbeat') return parseHeartbeat(payload);
  const event = AgentStreamEventSchema.safeParse(payload);
  if (!event.success) {
    throw new SseProtocolError(STREAM_PROTOCOL_ERROR_MESSAGE, { cause: event.error });
  }
  if (frame.event !== 'message' && frame.event !== event.data.type) {
    throw new SseProtocolError(STREAM_PROTOCOL_ERROR_MESSAGE);
  }
  return { kind: 'event', event: event.data };
}

export function computeRetryDelay(attempt: number, random: () => number = Math.random): number {
  const exponent = Math.max(0, attempt - 1);
  const base = Math.min(MAX_RETRY_DELAY_MS, BASE_RETRY_DELAY_MS * 2 ** exponent);
  const jitter = 1 - JITTER_RATIO + random() * JITTER_RATIO * 2;
  return Math.round(base * jitter);
}

export function isTerminalStreamStatus(status: number): boolean {
  return TERMINAL_STATUSES.has(status);
}

function parseField(line: string): SseField | null {
  if (!line || line.startsWith(':')) return null;
  const separator = line.indexOf(':');
  if (separator < 0) return { name: line, value: '' };
  const rawValue = line.slice(separator + 1);
  return {
    name: line.slice(0, separator),
    value: rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue,
  };
}

function applyField(frame: MutableSseFrame, field: SseField): void {
  switch (field.name) {
    case 'data':
      frame.data.push(field.value);
      return;
    case 'event':
      frame.event = field.value;
      return;
    case 'id':
      frame.id = field.value;
      return;
    case 'retry': {
      const retry = parseRetry(field.value);
      if (retry !== undefined) frame.retry = retry;
    }
  }
}

function finalizeFrame(frame: MutableSseFrame): SseFrame {
  return {
    event: frame.event,
    data: frame.data.join('\n'),
    ...(frame.id === undefined ? {} : { id: frame.id }),
    ...(frame.retry === undefined ? {} : { retry: frame.retry }),
  };
}

function parseHeartbeat(payload: unknown): ParsedStreamFrame {
  const heartbeat = HeartbeatSchema.safeParse(payload);
  if (heartbeat.success) return { kind: 'heartbeat' };
  throw new SseProtocolError(STREAM_PROTOCOL_ERROR_MESSAGE, { cause: heartbeat.error });
}

function parseRetry(value: string): number | undefined {
  const retry = Number(value);
  return Number.isInteger(retry) && retry >= 0 ? retry : undefined;
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new SseProtocolError(STREAM_PROTOCOL_ERROR_MESSAGE, { cause: error });
  }
}

