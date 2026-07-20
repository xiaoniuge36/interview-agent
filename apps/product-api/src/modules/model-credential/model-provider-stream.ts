import type { ModelProvider } from '@interview-agent/contracts';

const KILOBYTE = 1024;
const MAX_LINE_KILOBYTES = 64;
const MAX_STREAM_BYTES = 2 * KILOBYTE * KILOBYTE;
const MAX_LINE_BYTES = MAX_LINE_KILOBYTES * KILOBYTE;

export type ModelTokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  reasoningTokens?: number;
  totalTokens?: number;
};

export type ProviderStreamEvent =
  { type: 'text'; value: string } | { type: 'usage'; value: ModelTokenUsage };

export class ModelProviderStreamError extends Error {
  constructor(
    readonly code: 'MODEL_PROVIDER_RESPONSE_INVALID' | 'MODEL_PROVIDER_STREAM_TOO_LARGE',
  ) {
    super(code);
    this.name = ModelProviderStreamError.name;
  }
}

export async function* providerTextDeltas(
  body: ReadableStream<Uint8Array> | null,
  provider: ModelProvider,
): AsyncGenerator<string> {
  for await (const event of providerStreamEvents(body, provider)) {
    if (event.type === 'text') yield event.value;
  }
}

export async function* providerStreamEvents(
  body: ReadableStream<Uint8Array> | null,
  provider: ModelProvider,
): AsyncGenerator<ProviderStreamEvent> {
  if (!body) throw new ModelProviderStreamError('MODEL_PROVIDER_RESPONSE_INVALID');
  let usage: ModelTokenUsage = {};
  for await (const lines of streamLines(body)) {
    const normalized = normalizeEvents(lines, provider, usage);
    usage = normalized.usage;
    yield* normalized.events;
  }
}

async function* streamLines(body: ReadableStream<Uint8Array>): AsyncGenerator<string[]> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let totalBytes = 0;
  try {
    let next = await reader.read();
    while (!next.done) {
      totalBytes = checkedStreamBytes(totalBytes, next.value.byteLength);
      buffer += decoder.decode(next.value, { stream: true });
      const extracted = extractLines(buffer);
      buffer = extracted.remainder;
      if (extracted.lines.length) yield extracted.lines;
      next = await reader.read();
    }
    const finalLines = extractLines(buffer + decoder.decode(), true).lines;
    if (finalLines.length) yield finalLines;
  } finally {
    reader.releaseLock();
  }
}

function normalizeEvents(
  lines: string[],
  provider: ModelProvider,
  initialUsage: ModelTokenUsage,
): { events: ProviderStreamEvent[]; usage: ModelTokenUsage } {
  const events: ProviderStreamEvent[] = [];
  let usage = initialUsage;
  for (const line of lines) {
    for (const event of providerEvents(line, provider)) {
      if (event.type === 'usage') {
        usage = mergeUsage(usage, event.value);
        events.push({ type: 'usage', value: usage });
      } else {
        events.push(event);
      }
    }
  }
  return { events, usage };
}

function checkedStreamBytes(totalBytes: number, chunkBytes: number): number {
  const nextTotal = totalBytes + chunkBytes;
  if (nextTotal > MAX_STREAM_BYTES)
    throw new ModelProviderStreamError('MODEL_PROVIDER_STREAM_TOO_LARGE');
  return nextTotal;
}

function extractLines(buffer: string, flush = false): { lines: string[]; remainder: string } {
  const lines = buffer.split(/\r?\n/u);
  const remainder = flush ? '' : (lines.pop() ?? '');
  if (new TextEncoder().encode(remainder).byteLength > MAX_LINE_BYTES) {
    throw new ModelProviderStreamError('MODEL_PROVIDER_STREAM_TOO_LARGE');
  }
  return { lines, remainder };
}

function providerEvents(line: string, provider: ModelProvider): ProviderStreamEvent[] {
  if (!line.startsWith('data:')) return [];
  const payload = line.slice('data:'.length).trimStart();
  if (!payload || payload === '[DONE]') return [];
  const parsed = parsePayload(payload);
  const text = provider === 'anthropic' ? anthropicDelta(parsed) : compatibleDelta(parsed);
  const usage = provider === 'anthropic' ? anthropicUsage(parsed) : compatibleUsage(parsed);
  return [
    ...(text ? [{ type: 'text' as const, value: text }] : []),
    ...(usage ? [{ type: 'usage' as const, value: usage }] : []),
  ];
}

function parsePayload(payload: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(payload);
    if (isRecord(parsed)) return parsed;
  } catch {
    // Fall through to the safe provider error below.
  }
  throw new ModelProviderStreamError('MODEL_PROVIDER_RESPONSE_INVALID');
}

function compatibleDelta(payload: Record<string, unknown>): string | null {
  const choice = Array.isArray(payload.choices) ? payload.choices[0] : null;
  if (!isRecord(choice) || !isRecord(choice.delta)) return null;
  return typeof choice.delta.content === 'string' ? choice.delta.content : null;
}

function anthropicDelta(payload: Record<string, unknown>): string | null {
  if (payload.type !== 'content_block_delta' || !isRecord(payload.delta)) return null;
  return typeof payload.delta.text === 'string' ? payload.delta.text : null;
}

function compatibleUsage(payload: Record<string, unknown>): ModelTokenUsage | null {
  if (!isRecord(payload.usage)) return null;
  const usage = payload.usage;
  const promptDetails = isRecord(usage.prompt_tokens_details) ? usage.prompt_tokens_details : {};
  const completionDetails = isRecord(usage.completion_tokens_details)
    ? usage.completion_tokens_details
    : {};
  return tokenUsage({
    inputTokens: integer(usage.prompt_tokens),
    outputTokens: integer(usage.completion_tokens),
    cacheReadTokens: integer(promptDetails.cached_tokens),
    reasoningTokens: integer(completionDetails.reasoning_tokens),
    totalTokens: integer(usage.total_tokens),
  });
}

function anthropicUsage(payload: Record<string, unknown>): ModelTokenUsage | null {
  const message = isRecord(payload.message) ? payload.message : {};
  const usage = isRecord(payload.usage) ? payload.usage : message.usage;
  if (!isRecord(usage)) return null;
  return tokenUsage({
    inputTokens: integer(usage.input_tokens),
    outputTokens: integer(usage.output_tokens),
    cacheReadTokens: integer(usage.cache_read_input_tokens),
  });
}

function tokenUsage(input: Record<string, number | undefined>): ModelTokenUsage | null {
  const usage = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as ModelTokenUsage;
  return Object.keys(usage).length ? usage : null;
}

function mergeUsage(previous: ModelTokenUsage, next: ModelTokenUsage): ModelTokenUsage {
  const merged = { ...previous, ...next };
  if (
    next.totalTokens === undefined &&
    merged.inputTokens !== undefined &&
    merged.outputTokens !== undefined
  ) {
    merged.totalTokens = merged.inputTokens + merged.outputTokens;
  }
  return merged;
}

function integer(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
