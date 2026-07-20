import {
  CreateModelCredentialInputSchema,
  ModelCredentialListSchema,
  ModelCredentialViewSchema,
  UpdateModelCredentialInputSchema,
  type CreateModelCredentialInput,
  type ModelCredentialView,
  type UpdateModelCredentialInput,
} from '@interview-agent/contracts';
import { z } from 'zod';
import { AdminApiError, adminRequest } from './api';

const HTTP_OK = 200;
const HTTP_BAD_GATEWAY = 502;

export const AdminPageAgentConfigSchema = z.object({
  enabled: z.boolean(),
  model: z.string().nullable(),
  provider: z.string().nullable(),
  message: z.string().nullable(),
});

export type AdminPageAgentConfig = z.infer<typeof AdminPageAgentConfigSchema>;

export function getAdminPageAgentConfig(signal?: AbortSignal) {
  return adminRequest({
    path: '/admin/page-agent/config',
    schema: AdminPageAgentConfigSchema,
    ...(signal ? { init: { signal } } : {}),
  });
}

export function pageAgentFetch(_url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const body = parseBody(init?.body);
  return adminRequest({
    path: '/admin/page-agent/chat/completions',
    schema: z.unknown(),
    init: {
      method: 'POST',
      body: JSON.stringify(body),
      ...(init?.signal ? { signal: init.signal } : {}),
    },
  })
    .then((payload) => jsonResponse(payload, HTTP_OK))
    .catch((error: unknown) => {
      if (!(error instanceof AdminApiError)) throw error;
      return jsonResponse(
        { error: { code: error.code, message: error.message, requestId: error.requestId } },
        error.status ?? HTTP_BAD_GATEWAY,
      );
    });
}

export function listAdminModelCredentials(signal?: AbortSignal): Promise<ModelCredentialView[]> {
  return adminRequest({
    path: '/model-credentials',
    schema: ModelCredentialListSchema,
    ...(signal ? { init: { signal } } : {}),
  });
}

export function createAdminModelCredential(
  input: CreateModelCredentialInput,
): Promise<ModelCredentialView> {
  return adminRequest({
    path: '/model-credentials',
    schema: ModelCredentialViewSchema,
    init: { method: 'POST', body: JSON.stringify(CreateModelCredentialInputSchema.parse(input)) },
  });
}

export function testAdminModelCredential(credentialId: string): Promise<ModelCredentialView> {
  return adminRequest({
    path: `/model-credentials/${encodeURIComponent(credentialId)}/test`,
    schema: ModelCredentialViewSchema,
    init: { method: 'POST' },
  });
}

export function updateAdminModelCredential(
  credentialId: string,
  input: UpdateModelCredentialInput,
): Promise<ModelCredentialView> {
  return adminRequest(createUpdateAdminModelCredentialRequest(credentialId, input));
}

export function createUpdateAdminModelCredentialRequest(
  credentialId: string,
  input: UpdateModelCredentialInput,
) {
  return {
    path: `/model-credentials/${encodeURIComponent(credentialId)}`,
    schema: ModelCredentialViewSchema,
    init: {
      method: 'PATCH',
      body: JSON.stringify(UpdateModelCredentialInputSchema.parse(input)),
    },
  };
}

export function deleteAdminModelCredential(credentialId: string): Promise<null> {
  return adminRequest(createDeleteAdminModelCredentialRequest(credentialId));
}

export function createDeleteAdminModelCredentialRequest(credentialId: string) {
  return {
    path: `/model-credentials/${encodeURIComponent(credentialId)}`,
    schema: z.null(),
    init: { method: 'DELETE' },
  };
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
