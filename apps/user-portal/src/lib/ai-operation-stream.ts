import {
  AiOperationStreamEventSchema,
  ApiErrorEnvelopeSchema,
  type AiOperationResultEvent,
  type AiOperationStreamEvent,
} from '@interview-agent/contracts';
import { ApiError, apiUrl, authorizedHeaders } from './api';
import { extractSseFrames, parseSseFrame } from './sse';

const STREAM_ERROR_MESSAGE = 'AI 操作连接异常，请稍后重试。';
const MAX_STREAM_BUFFER_BYTES = 1_048_576;

export type AiOperationStreamRequest = {
  path: string;
  body: object;
  idempotencyKey?: string;
  signal?: AbortSignal;
  onEvent?: (event: AiOperationStreamEvent) => void;
};

export async function runAiOperationStream(
  request: AiOperationStreamRequest,
): Promise<AiOperationResultEvent> {
  const headers = await authorizedHeaders({
    Accept: 'text/event-stream',
    'Content-Type': 'application/json',
    ...(request.idempotencyKey ? { 'Idempotency-Key': request.idempotencyKey } : {}),
  });
  const response = await fetch(apiUrl(request.path), {
    method: 'POST',
    headers,
    body: JSON.stringify(request.body),
    cache: 'no-store',
    ...(request.signal ? { signal: request.signal } : {}),
  });
  if (!response.ok) throw await httpError(response);
  if (!response.body)
    throw new ApiError({ code: 'SSE_CONNECTION_FAILED', message: STREAM_ERROR_MESSAGE });
  return consume(response.body, request.onEvent);
}

export function parseAiOperationFrame(rawFrame: string): AiOperationStreamEvent | null {
  if (!rawFrame.trim() || rawFrame.trimStart().startsWith(':')) return null;
  const frame = parseSseFrame(rawFrame);
  const payload = parseJson(frame.data);
  const event = AiOperationStreamEventSchema.safeParse(payload);
  if (!event.success || (frame.event !== 'message' && frame.event !== event.data.type)) {
    throw new ApiError({ code: 'SSE_PROTOCOL_ERROR', message: STREAM_ERROR_MESSAGE });
  }
  return event.data;
}

async function consume(
  body: ReadableStream<Uint8Array>,
  onEvent: AiOperationStreamRequest['onEvent'],
): Promise<AiOperationResultEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      assertBufferSize(buffer);
      const extracted = extractSseFrames(buffer);
      buffer = extracted.remainder;
      const result = consumeFrames(extracted.frames, onEvent);
      if (result) return result;
    }
    throw new ApiError({ code: 'SSE_RESULT_MISSING', message: STREAM_ERROR_MESSAGE });
  } finally {
    reader.releaseLock();
  }
}

function consumeFrames(
  frames: string[],
  onEvent: AiOperationStreamRequest['onEvent'],
): AiOperationResultEvent | undefined {
  for (const frame of frames) {
    const result = consumeFrame(frame, onEvent);
    if (result) return result;
  }
  return undefined;
}

function consumeFrame(
  frame: string,
  onEvent: AiOperationStreamRequest['onEvent'],
): AiOperationResultEvent | undefined {
  const event = parseAiOperationFrame(frame);
  if (!event) return undefined;
  onEvent?.(event);
  if (event.type === 'error') throw eventError(event);
  return event.type === 'result' ? event : undefined;
}

async function httpError(response: Response): Promise<ApiError> {
  const payload = await response.json().catch(() => null);
  const envelope = ApiErrorEnvelopeSchema.safeParse(payload);
  if (!envelope.success) {
    return new ApiError({
      code: 'SSE_CONNECTION_FAILED',
      message: STREAM_ERROR_MESSAGE,
      status: response.status,
    });
  }
  return new ApiError({
    code: envelope.data.error.code,
    message: envelope.data.error.message,
    status: response.status,
    requestId: envelope.data.requestId,
  });
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new ApiError({ code: 'SSE_PROTOCOL_ERROR', message: STREAM_ERROR_MESSAGE });
  }
}

function eventError(event: Extract<AiOperationStreamEvent, { type: 'error' }>): ApiError {
  return new ApiError({
    code: event.code,
    message: event.message,
    ...(event.requestId ? { requestId: event.requestId } : {}),
  });
}

function assertBufferSize(buffer: string): void {
  if (new TextEncoder().encode(buffer).byteLength > MAX_STREAM_BUFFER_BYTES) {
    throw new ApiError({ code: 'SSE_BUFFER_TOO_LARGE', message: STREAM_ERROR_MESSAGE });
  }
}
