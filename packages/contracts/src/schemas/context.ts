import { z } from 'zod';
import { CONTRACT_LIMITS } from '../limits';

export const RoleSchema = z.enum([
  'user',
  'question_reviewer',
  'admin',
  'support',
  'agent_runtime',
]);

export const ActionSchema = z.enum([
  'profile:read',
  'profile:write',
  'job_intent:read',
  'job_intent:write',
  'interview:create',
  'interview:advance',
  'interview:read',
  'interview:answer',
  'interview:stream',
  'question:read',
  'question:write',
  'candidate:review',
  'content:import',
  'practice:create',
  'practice:read',
  'practice:answer',
  'practice:submit',
  'mastery:read',
  'model:manage',
  'audit:read',
  'support:access',
]);

export const ActorSchema = z.object({
  id: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  subject: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  role: RoleSchema,
  tenantId: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  scopes: z.array(ActionSchema).max(ActionSchema.options.length),
});

export const RequestContextSchema = z.object({
  requestId: z.string().min(CONTRACT_LIMITS.traceIdMinLength).max(CONTRACT_LIMITS.traceIdMaxLength),
  traceId: z.string().min(CONTRACT_LIMITS.traceIdMinLength).max(CONTRACT_LIMITS.traceIdMaxLength),
  tenantId: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  actor: ActorSchema,
});

export type Role = z.infer<typeof RoleSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type Actor = z.infer<typeof ActorSchema>;
export type RequestContext = z.infer<typeof RequestContextSchema>;
