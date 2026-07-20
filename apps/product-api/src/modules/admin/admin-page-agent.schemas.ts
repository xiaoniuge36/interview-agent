import { z } from 'zod';

const MAX_MESSAGES = 80;
const MAX_TOOLS = 40;
const MAX_BODY_BYTES = 700_000;
const MAX_TOKENS = 4_000;
const MAX_REASONING_TEXT = 32;

export const PageAgentCompletionRequestSchema = z
  .object({
    messages: z.array(z.unknown()).min(1).max(MAX_MESSAGES),
    tools: z.array(z.unknown()).min(1).max(MAX_TOOLS),
    tool_choice: z.unknown().optional(),
    parallel_tool_calls: z.boolean().optional(),
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().int().min(1).max(MAX_TOKENS).optional(),
    enable_thinking: z.boolean().optional(),
    thinking: z.unknown().optional(),
    reasoning_effort: z.string().max(MAX_REASONING_TEXT).optional(),
    reasoning: z.unknown().optional(),
    verbosity: z.string().max(MAX_REASONING_TEXT).optional(),
  })
  .passthrough();

export type PageAgentCompletionRequest = z.infer<typeof PageAgentCompletionRequestSchema>;

export const PageAgentConfigSchema = z.object({
  enabled: z.boolean(),
  model: z.string().nullable(),
  provider: z.string().nullable(),
  message: z.string().nullable(),
});

export type PageAgentConfig = z.infer<typeof PageAgentConfigSchema>;

const ADMIN_AGENT_TITLE_MAX_LENGTH = 80;
const ADMIN_AGENT_MESSAGE_MAX_LENGTH = 20_000;

export const AdminPageAgentMessageRoleSchema = z.enum(['user', 'assistant', 'error']);
export const AdminPageAgentMessageSchema = z.object({
  id: z.string(),
  role: AdminPageAgentMessageRoleSchema,
  content: z.string(),
  tokenCount: z.number().int().nonnegative().nullable(),
  createdAt: z.string().datetime(),
});
export const AdminPageAgentConversationSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  messageCount: z.number().int().nonnegative(),
  lastMessagePreview: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export const AdminPageAgentConversationSchema = AdminPageAgentConversationSummarySchema.extend({
  messages: z.array(AdminPageAgentMessageSchema),
});
export const AdminPageAgentConversationListSchema = z.array(
  AdminPageAgentConversationSummarySchema,
);
export const AdminPageAgentCreateConversationSchema = z.object({
  title: z.string().trim().max(ADMIN_AGENT_TITLE_MAX_LENGTH).optional(),
});
export const AdminPageAgentRenameConversationSchema = z.object({
  title: z.string().trim().min(1).max(ADMIN_AGENT_TITLE_MAX_LENGTH),
});
export const AdminPageAgentAppendMessagesSchema = z.object({
  messages: z
    .array(
      z.object({
        role: AdminPageAgentMessageRoleSchema,
        content: z.string().trim().min(1).max(ADMIN_AGENT_MESSAGE_MAX_LENGTH),
        tokenCount: z.number().int().nonnegative().optional(),
      }),
    )
    .min(1)
    .max(2),
});

export type AdminPageAgentMessageInput = z.infer<
  typeof AdminPageAgentAppendMessagesSchema
>['messages'][number];

export function parsePageAgentCompletion(body: unknown): PageAgentCompletionRequest {
  const serialized = JSON.stringify(body) ?? '';
  if (new TextEncoder().encode(serialized).byteLength > MAX_BODY_BYTES) {
    throw new Error('PAGE_AGENT_REQUEST_TOO_LARGE');
  }
  return PageAgentCompletionRequestSchema.parse(body);
}

export function sanitizedPageAgentBody(
  request: PageAgentCompletionRequest,
  model: string,
): Record<string, unknown> {
  const allowedKeys = [
    'messages',
    'tools',
    'tool_choice',
    'parallel_tool_calls',
    'temperature',
    'max_tokens',
    'enable_thinking',
    'thinking',
    'reasoning_effort',
    'reasoning',
    'verbosity',
  ] as const;
  const body = Object.fromEntries(
    allowedKeys.flatMap((key) => (request[key] === undefined ? [] : [[key, request[key]]])),
  );
  return { ...body, model, messages: maskSensitiveValues(body.messages) };
}

function maskSensitiveValues(value: unknown): unknown {
  if (typeof value === 'string') return maskSensitiveText(value);
  if (Array.isArray(value)) return value.map(maskSensitiveValues);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      isSensitiveKey(key) ? '[已隐藏]' : maskSensitiveValues(item),
    ]),
  );
}

function isSensitiveKey(key: string): boolean {
  return /password|passcode|api[_-]?key|secret|token|authorization/i.test(key);
}

function maskSensitiveText(value: string): string {
  return value
    .replace(/\bBearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [已隐藏]')
    .replace(/\b(1[3-9]\d)\d{4}(\d{4})\b/g, '$1****$2')
    .replace(/\b([a-zA-Z0-9._%+-])[^@\s]*(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g, '$1***$2');
}
