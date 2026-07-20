import { z } from 'zod';
import { CONTRACT_LIMITS } from '../limits';
import { AgentRunViewSchema } from './admin';

const AgentRunModelUsageSchema = z.object({
  provider: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  model: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  invocationCount: z.number().int().positive(),
  inputTokens: z.number().int().nonnegative().nullable(),
  outputTokens: z.number().int().nonnegative().nullable(),
  cacheReadTokens: z.number().int().nonnegative().nullable(),
  reasoningTokens: z.number().int().nonnegative().nullable(),
  totalTokens: z.number().int().nonnegative().nullable(),
  latencyMs: z.number().int().nonnegative().nullable(),
});

export const AgentRunDetailViewSchema = AgentRunViewSchema.extend({
  tenant: z.object({
    id: z.string().min(1),
    name: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  }),
  user: z
    .object({
      id: z.string().min(1),
      name: z.string().min(1).max(CONTRACT_LIMITS.shortText).nullable(),
      email: z.string().email().nullable(),
    })
    .nullable(),
  sessionTitle: z.string().min(1).max(CONTRACT_LIMITS.shortText).nullable(),
  command: z.enum(['start', 'advance', 'answer']).nullable(),
  modelUsage: AgentRunModelUsageSchema.nullable(),
});

export type AgentRunDetailView = z.infer<typeof AgentRunDetailViewSchema>;
