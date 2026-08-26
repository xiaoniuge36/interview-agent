import { z } from 'zod';
import { isSensitiveField, redactSensitiveText } from '../../common/security/sensitive-data';

const MAX_MESSAGES = 80;
const MAX_TOOLS = 40;
const MAX_BODY_BYTES = 700_000;
const MAX_TOKENS = 4_000;
const MAX_REASONING_TEXT = 32;
const TITLE_MAX_LENGTH = 80;
const MESSAGE_MAX_LENGTH = 20_000;
const RUN_PROMPT_MAX_LENGTH = 4_000;
const RUN_STEP_MAX_LENGTH = 500;
const RUN_ERROR_CODE_MAX_LENGTH = 100;
const RUN_ERROR_SUMMARY_MAX_LENGTH = 2_000;
const RUN_ID_MAX_LENGTH = 128;

// 内部哨兵错误信息：由各侧助手服务映射为面向用户的错误码与文案，不直接出现在响应中。
export const PAGE_AGENT_REQUEST_TOO_LARGE = 'PAGE_AGENT_REQUEST_TOO_LARGE';

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

export const PageAgentMessageRoleSchema = z.enum(['user', 'assistant', 'error']);
export const PageAgentMessageSchema = z.object({
  id: z.string(),
  role: PageAgentMessageRoleSchema,
  content: z.string(),
  tokenCount: z.number().int().nonnegative().nullable(),
  createdAt: z.string().datetime(),
});
export const PageAgentConversationSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  messageCount: z.number().int().nonnegative(),
  lastMessagePreview: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export const PageAgentConversationSchema = PageAgentConversationSummarySchema.extend({
  messages: z.array(PageAgentMessageSchema),
});
export const PageAgentConversationListSchema = z.array(PageAgentConversationSummarySchema);
export const PageAgentCreateConversationSchema = z.object({
  title: z.string().trim().max(TITLE_MAX_LENGTH).optional(),
});
export const PageAgentRenameConversationSchema = z.object({
  title: z.string().trim().min(1).max(TITLE_MAX_LENGTH),
});
export const PageAgentAppendMessagesSchema = z.object({
  messages: z
    .array(
      z.object({
        role: PageAgentMessageRoleSchema,
        content: z.string().trim().min(1).max(MESSAGE_MAX_LENGTH),
        tokenCount: z.number().int().nonnegative().optional(),
      }),
    )
    .min(1)
    .max(2),
});

export type PageAgentMessageInput = z.infer<
  typeof PageAgentAppendMessagesSchema
>['messages'][number];

export const PageAgentRunStatusSchema = z.enum([
  'running',
  'waiting_confirmation',
  'succeeded',
  'failed',
  'cancelled',
  'interrupted',
]);
export const PageAgentRunSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  retryOfRunId: z.string().nullable(),
  prompt: z.string(),
  status: PageAgentRunStatusSchema,
  currentStep: z.string().nullable(),
  tokenCount: z.number().int().nonnegative(),
  traceId: z.string(),
  errorCode: z.string().nullable(),
  errorSummary: z.string().nullable(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().nullable(),
  heartbeatAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export const PageAgentCreateRunSchema = z.object({
  prompt: z.string().trim().min(1).max(RUN_PROMPT_MAX_LENGTH),
  clientRequestId: z.string().uuid(),
  retryOfRunId: z.string().max(RUN_ID_MAX_LENGTH).optional(),
});
export const PageAgentHeartbeatRunSchema = z.object({
  status: z.enum(['running', 'waiting_confirmation']),
  currentStep: z.string().trim().max(RUN_STEP_MAX_LENGTH).optional(),
  tokenCount: z.number().int().nonnegative().optional(),
});
export const PageAgentCompleteRunSchema = z.object({
  status: z.enum(['succeeded', 'failed', 'cancelled']),
  currentStep: z.string().trim().max(RUN_STEP_MAX_LENGTH).optional(),
  tokenCount: z.number().int().nonnegative().optional(),
  errorCode: z.string().trim().max(RUN_ERROR_CODE_MAX_LENGTH).optional(),
  errorSummary: z.string().trim().max(RUN_ERROR_SUMMARY_MAX_LENGTH).optional(),
});

export type PageAgentCreateRunInput = z.infer<typeof PageAgentCreateRunSchema>;
export type PageAgentHeartbeatRunInput = z.infer<typeof PageAgentHeartbeatRunSchema>;
export type PageAgentCompleteRunInput = z.infer<typeof PageAgentCompleteRunSchema>;

export function parsePageAgentCompletion(body: unknown): PageAgentCompletionRequest {
  const serialized = JSON.stringify(body) ?? '';
  if (new TextEncoder().encode(serialized).byteLength > MAX_BODY_BYTES) {
    throw new Error(PAGE_AGENT_REQUEST_TOO_LARGE);
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
  if (typeof value === 'string') return redactSensitiveText(value);
  if (Array.isArray(value)) return value.map(maskSensitiveValues);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      isSensitiveField(key) ? '[已隐藏]' : maskSensitiveValues(item),
    ]),
  );
}
