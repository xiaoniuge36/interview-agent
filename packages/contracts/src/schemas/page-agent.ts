import { z } from 'zod';

const NonNegativeCountSchema = z.number().int().nonnegative();

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
  tokenCount: NonNegativeCountSchema,
  traceId: z.string(),
  errorCode: z.string().nullable(),
  errorSummary: z.string().nullable(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().nullable(),
  heartbeatAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const PageAgentMessageRoleSchema = z.enum(['user', 'assistant', 'error']);

export const PageAgentMessageSchema = z.object({
  id: z.string(),
  role: PageAgentMessageRoleSchema,
  content: z.string(),
  tokenCount: NonNegativeCountSchema.nullable(),
  createdAt: z.string().datetime(),
});

export const PageAgentConversationSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  messageCount: NonNegativeCountSchema,
  lastMessagePreview: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const PageAgentConversationSchema = PageAgentConversationSummarySchema.extend({
  messages: z.array(PageAgentMessageSchema),
});

export const PageAgentConversationListSchema = z.array(PageAgentConversationSummarySchema);

export type PageAgentRunStatus = z.infer<typeof PageAgentRunStatusSchema>;
export type PageAgentRun = z.infer<typeof PageAgentRunSchema>;
export type PageAgentMessageRole = z.infer<typeof PageAgentMessageRoleSchema>;
export type PageAgentMessage = z.infer<typeof PageAgentMessageSchema>;
export type PageAgentConversationSummary = z.infer<typeof PageAgentConversationSummarySchema>;
export type PageAgentConversation = z.infer<typeof PageAgentConversationSchema>;
