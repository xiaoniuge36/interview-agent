import { AuthRequiredError } from '@interview-agent/auth-client';
import { ApiErrorEnvelopeSchema, type AgentStreamEvent } from '@interview-agent/contracts';
import { ApiError, apiUrl, authorizedHeaders } from './api';
import {
  computeRetryDelay,
  extractSseFrames,
  isTerminalStreamStatus,
  parseStreamFrame,
} from './sse';

const MAX_RECONNECT_ATTEMPTS = 5;
const MAX_STREAM_BUFFER_BYTES = 1_048_576;
const SEEN_EVENT_HISTORY_LIMIT = 500;

type StreamRetry = {
  attempt: number;
  delayMs: number;
  error: Error;
};

type StreamOptions = {
  sessionId: string;
  afterSequence: number;
  onEvent: (event: AgentStreamEvent) => void;
  onRetry: (retry: StreamRetry) => void;
  onTerminalError: (error: Error) => void;
};

type StreamState = {
  options: StreamOptions;
  cursor: number;
  seenEventIds: Set<string>;
  reconnectAttempts: number;
  controller: AbortController | null;
  timer: ReturnType<typeof setTimeout> | null;
  stopped: boolean;
};

export function subscribeInterviewEvents(options: StreamOptions): () => void {
  const state: StreamState = {
    options,
    cursor: options.afterSequence,
    seenEventIds: new Set<string>(),
    reconnectAttempts: 0,
    controller: null,
    timer: null,
    stopped: false,
  };
  void connect(state);
  return () => stop(state);
}

async function connect(state: StreamState): Promise<void> {
  if (state.stopped) return;
  clearReconnectTimer(state);
  const controller = replaceController(state);
  let reconnectError: Error | null = null;
  try {
    const response = await openConnection(state, controller);
    await consumeConnection(response, state);
    if (!state.stopped) reconnectError = new Error('SSE 连接已结束。');
  } catch (error) {
    if (!state.stopped && !isAbortError(error)) reconnectError = toError(error);
  } finally {
    releaseController(state, controller);
  }
  if (reconnectError) handleConnectionError(state, reconnectError);
}

async function openConnection(state: StreamState, controller: AbortController): Promise<Response> {
  const headers = await authorizedHeaders({ Accept: 'text/event-stream' });
  const query = '?after=' + encodeURIComponent(String(state.cursor));
  const response = await fetch(
    apiUrl('/interviews/' + state.options.sessionId + '/stream' + query),
    { headers, cache: 'no-store', signal: controller.signal },
  );
  if (!response.ok) throw await streamHttpError(response);
  if (!response.body) throw new Error('响应不包含可读取的 SSE 流。');
  return response;
}

async function consumeConnection(response: Response, state: StreamState): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('无法读取 SSE 响应流。');
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (!state.stopped) {
      const chunk = await reader.read();
      if (chunk.done) return;
      buffer += decoder.decode(chunk.value, { stream: true });
      assertBufferSize(buffer);
      buffer = deliverCompleteFrames(buffer, state);
    }
  } finally {
    reader.releaseLock();
  }
}

function deliverCompleteFrames(buffer: string, state: StreamState): string {
  const extracted = extractSseFrames(buffer);
  for (const frame of extracted.frames) deliverFrame(frame, state);
  return extracted.remainder;
}

function deliverFrame(rawFrame: string, state: StreamState): void {
  const parsed = parseStreamFrame(rawFrame);
  state.reconnectAttempts = 0;
  if (parsed.kind === 'heartbeat') return;
  const event = parsed.event;
  if (event.sequence <= state.cursor || state.seenEventIds.has(event.eventId)) return;
  state.cursor = event.sequence;
  rememberEvent(state.seenEventIds, event.eventId);
  state.options.onEvent(event);
}

function rememberEvent(eventIds: Set<string>, eventId: string): void {
  eventIds.add(eventId);
  if (eventIds.size <= SEEN_EVENT_HISTORY_LIMIT) return;
  const oldest = eventIds.values().next().value as string | undefined;
  if (oldest) eventIds.delete(oldest);
}

function handleConnectionError(state: StreamState, error: Error): void {
  if (isTerminalError(error)) {
    stop(state);
    state.options.onTerminalError(error);
    return;
  }
  scheduleReconnect(state, error);
}

function scheduleReconnect(state: StreamState, error: Error): void {
  state.reconnectAttempts += 1;
  if (state.reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
    stop(state);
    state.options.onTerminalError(new Error('SSE 重连次数已达到上限。', { cause: error }));
    return;
  }
  const delayMs = computeRetryDelay(state.reconnectAttempts);
  state.options.onRetry({ attempt: state.reconnectAttempts, delayMs, error });
  state.timer = setTimeout(() => void connect(state), delayMs);
}

function replaceController(state: StreamState): AbortController {
  state.controller?.abort();
  const controller = new AbortController();
  state.controller = controller;
  return controller;
}

function releaseController(state: StreamState, controller: AbortController): void {
  controller.abort();
  if (state.controller === controller) state.controller = null;
}

function clearReconnectTimer(state: StreamState): void {
  if (state.timer) clearTimeout(state.timer);
  state.timer = null;
}

function stop(state: StreamState): void {
  state.stopped = true;
  state.controller?.abort();
  state.controller = null;
  clearReconnectTimer(state);
}

async function streamHttpError(response: Response): Promise<ApiError> {
  const payload = await readErrorPayload(response);
  const envelope = ApiErrorEnvelopeSchema.safeParse(payload);
  return new ApiError({
    message: envelope.success ? envelope.data.error.message : 'SSE 连接失败。',
    code: envelope.success ? envelope.data.error.code : 'SSE_CONNECTION_FAILED',
    status: response.status,
    ...(envelope.success ? { requestId: envelope.data.requestId } : {}),
  });
}

async function readErrorPayload(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isTerminalError(error: Error): boolean {
  if (error instanceof AuthRequiredError) return true;
  return error instanceof ApiError && error.status !== undefined
    ? isTerminalStreamStatus(error.status)
    : false;
}

function assertBufferSize(buffer: string): void {
  const bytes = new TextEncoder().encode(buffer).byteLength;
  if (bytes > MAX_STREAM_BUFFER_BYTES) {
    throw new Error('SSE 缓冲区超过安全上限。');
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error('SSE 发生未知错误。');
}
