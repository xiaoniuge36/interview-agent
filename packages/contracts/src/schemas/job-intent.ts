import { z } from 'zod';
import { CONTRACT_LIMITS } from '../limits';

export const JobIntentStatusSchema = z.enum(['draft', 'analyzing', 'ready', 'archived']);

export const SkillWeightSchema = z.object({
  skill: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  weight: z.number().min(0).max(CONTRACT_LIMITS.percentage),
  reason: z.string().min(1).max(CONTRACT_LIMITS.mediumText),
});

export const JobIntentSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  targetRole: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  jdText: z.string().min(1).max(CONTRACT_LIMITS.longText),
  companyContext: z.string().max(CONTRACT_LIMITS.longText).optional(),
  communicationText: z.string().max(CONTRACT_LIMITS.longText).optional(),
  status: JobIntentStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const JobProfileSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  jobIntentId: z.string().min(1),
  skillWeights: z.array(SkillWeightSchema).max(CONTRACT_LIMITS.list),
  interviewFocus: z.array(z.string().max(CONTRACT_LIMITS.mediumText)).max(CONTRACT_LIMITS.list),
  riskSignals: z.array(z.string().max(CONTRACT_LIMITS.mediumText)).max(CONTRACT_LIMITS.list),
  prepAdvice: z.array(z.string().max(CONTRACT_LIMITS.mediumText)).max(CONTRACT_LIMITS.list),
  createdAt: z.string().datetime(),
});

export const JobIntentPayloadSchema = z.object({
  intent: JobIntentSchema,
  profile: JobProfileSchema.nullable(),
});

export const JobIntentListSchema = z.array(JobIntentPayloadSchema).max(CONTRACT_LIMITS.mediumList);

export const CreateJobIntentInputSchema = z.object({
  targetRole: z.string().trim().min(2).max(CONTRACT_LIMITS.shortText),
  jdText: z
    .string()
    .trim()
    .min(CONTRACT_LIMITS.minimumJobDescription)
    .max(CONTRACT_LIMITS.longText),
  companyContext: z.string().trim().max(CONTRACT_LIMITS.longText).optional().default(''),
  communicationText: z.string().trim().max(CONTRACT_LIMITS.longText).optional().default(''),
});

export type JobIntentStatus = z.infer<typeof JobIntentStatusSchema>;
export type JobIntent = z.infer<typeof JobIntentSchema>;
export type JobProfile = z.infer<typeof JobProfileSchema>;
export type JobIntentPayload = z.infer<typeof JobIntentPayloadSchema>;
export type CreateJobIntentInput = z.infer<typeof CreateJobIntentInputSchema>;
