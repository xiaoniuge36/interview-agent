import { HttpStatus } from '@nestjs/common';
import { AgentRuntimeNextResponseSchema } from '@interview-agent/contracts';
import type {
  AgentNextDecision,
  RuntimeFailure,
  RuntimeInvocationOutcome,
} from './agent-runtime.types';

const MAX_RESPONSE_BYTES = 65_536;

export async function parseRuntimeDecision(response: Response): Promise<RuntimeInvocationOutcome> {
  if (declaredBodyTooLarge(response)) return schemaFailure();
  const text = await readBoundedBody(response);
  if (text === undefined) return schemaFailure();
  return parseResponseText(text);
}

export function httpFailure(status: number): RuntimeFailure {
  const retryable =
    status === HttpStatus.REQUEST_TIMEOUT ||
    status === HttpStatus.TOO_MANY_REQUESTS ||
    status >= HttpStatus.INTERNAL_SERVER_ERROR;
  return {
    kind: retryable ? 'unavailable' : 'rejected',
    code: retryable ? `AGENT_RUNTIME_HTTP_${status}` : 'AGENT_RUNTIME_REQUEST_REJECTED',
    retryable,
    schemaValid: null,
  };
}

export function unavailableFailure(code: string): RuntimeFailure {
  return { kind: 'unavailable', code, retryable: true, schemaValid: null };
}

function parseResponseText(text: string): RuntimeInvocationOutcome {
  try {
    const parsed = AgentRuntimeNextResponseSchema.safeParse(JSON.parse(text));
    if (!parsed.success) return schemaFailure();
    return { decision: decisionFrom(parsed.data) };
  } catch {
    return schemaFailure();
  }
}

function decisionFrom(input: {
  stage: AgentNextDecision['stage'];
  content: string;
  shouldFinish: boolean;
}): AgentNextDecision {
  return {
    stage: input.stage,
    content: input.content,
    shouldFinish: input.shouldFinish,
  };
}

function declaredBodyTooLarge(response: Response) {
  const value = response.headers.get('content-length');
  if (!value) return false;
  const length = Number(value);
  return Number.isFinite(length) && length > MAX_RESPONSE_BYTES;
}

async function readBoundedBody(response: Response): Promise<string | undefined> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let output = '';
  try {
    let chunk = await reader.read();
    while (!chunk.done) {
      totalBytes += chunk.value.byteLength;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        return undefined;
      }
      output += decoder.decode(chunk.value, { stream: true });
      chunk = await reader.read();
    }
    return output + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

function schemaFailure(): RuntimeFailure {
  return {
    kind: 'schema',
    code: 'AGENT_RUNTIME_SCHEMA_INVALID',
    retryable: false,
    schemaValid: false,
  };
}
