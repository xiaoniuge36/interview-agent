import { z } from 'zod';
import { ApiError, apiRequest } from './api';

const HTTP_OK = 200;
const HTTP_BAD_GATEWAY = 502;

export const UserPageAgentConfigSchema = z.object({
  enabled: z.boolean(),
  model: z.string().nullable(),
  provider: z.string().nullable(),
  message: z.string().nullable(),
});

export type UserPageAgentConfig = z.infer<typeof UserPageAgentConfigSchema>;

export function getUserPageAgentConfig(signal?: AbortSignal) {
  return apiRequest({
    path: '/user/page-agent/config',
    schema: UserPageAgentConfigSchema,
    ...(signal ? { init: { signal } } : {}),
  });
}

export function createUserPageAgentCompletionRequest(body: unknown, signal?: AbortSignal) {
  return {
    path: '/user/page-agent/chat/completions',
    schema: z.unknown(),
    init: {
      method: 'POST',
      body: JSON.stringify(body),
      ...(signal ? { signal } : {}),
    },
  };
}

export function userPageAgentFetch(_url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return apiRequest(
    createUserPageAgentCompletionRequest(parseBody(init?.body), init?.signal ?? undefined),
  )
    .then((payload) => jsonResponse(payload, HTTP_OK))
    .catch((error: unknown) => {
      if (!(error instanceof ApiError)) throw error;
      return jsonResponse(
        { error: { code: error.code, message: error.message, requestId: error.requestId } },
        error.status ?? HTTP_BAD_GATEWAY,
      );
    });
}

function parseBody(body: BodyInit | null | undefined): unknown {
  if (typeof body !== 'string') return {};
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
}

function jsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
