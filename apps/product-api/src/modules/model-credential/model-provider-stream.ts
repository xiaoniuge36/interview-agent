import type { ModelProvider } from '@interview-agent/contracts';

const KILOBYTE = 1024;
const MAX_LINE_KILOBYTES = 64;
const MAX_STREAM_BYTES = 2 * KILOBYTE * KILOBYTE;
const MAX_LINE_BYTES = MAX_LINE_KILOBYTES * KILOBYTE;

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
  if (!body) throw new ModelProviderStreamError('MODEL_PROVIDER_RESPONSE_INVALID');
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let totalBytes = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      totalBytes += next.value.byteLength;
      if (totalBytes > MAX_STREAM_BYTES)
        throw new ModelProviderStreamError('MODEL_PROVIDER_STREAM_TOO_LARGE');
      buffer += decoder.decode(next.value, { stream: true });
      const extracted = extractLines(buffer);
      buffer = extracted.remainder;
      yield* deltasForLines(extracted.lines, provider);
    }
    buffer += decoder.decode();
    yield* deltasForLines(extractLines(buffer, true).lines, provider);
  } finally {
    reader.releaseLock();
  }
}

function* deltasForLines(lines: string[], provider: ModelProvider): Generator<string> {
  for (const line of lines) {
    const delta = providerDelta(line, provider);
    if (delta) yield delta;
  }
}

function extractLines(buffer: string, flush = false): { lines: string[]; remainder: string } {
  const lines = buffer.split(/\r?\n/u);
  const remainder = flush ? '' : (lines.pop() ?? '');
  if (new TextEncoder().encode(remainder).byteLength > MAX_LINE_BYTES) {
    throw new ModelProviderStreamError('MODEL_PROVIDER_STREAM_TOO_LARGE');
  }
  return { lines, remainder };
}

function providerDelta(line: string, provider: ModelProvider): string | null {
  if (!line.startsWith('data:')) return null;
  const payload = line.slice('data:'.length).trimStart();
  if (!payload || payload === '[DONE]') return null;
  const parsed = parsePayload(payload);
  return provider === 'anthropic' ? anthropicDelta(parsed) : compatibleDelta(parsed);
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
