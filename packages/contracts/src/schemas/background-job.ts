import { z } from 'zod';
import { CONTRACT_LIMITS } from '../limits';

export const BackgroundJobTypeSchema = z.enum(['embedding']);
export const BackgroundJobStatusSchema = z.enum([
  'pending',
  'running',
  'retry_wait',
  'succeeded',
  'dead_letter',
]);

export const BackgroundJobSchema = z.object({
  id: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  tenantId: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  type: BackgroundJobTypeSchema,
  status: BackgroundJobStatusSchema,
  attempts: z.number().int().nonnegative(),
  maxAttempts: z.number().int().positive(),
  payload: z.record(z.unknown()),
  availableAt: z.string().datetime(),
  leaseOwner: z.string().min(1).max(CONTRACT_LIMITS.shortText).nullable().optional(),
  leaseExpiresAt: z.string().datetime().nullable().optional(),
  errorCode: z.string().min(1).max(CONTRACT_LIMITS.errorCode).nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type BackgroundJobType = z.infer<typeof BackgroundJobTypeSchema>;
export type BackgroundJobStatus = z.infer<typeof BackgroundJobStatusSchema>;
export type BackgroundJob = z.infer<typeof BackgroundJobSchema>;
