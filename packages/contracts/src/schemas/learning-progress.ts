import { z } from 'zod';
import { CONTRACT_LIMITS } from '../limits';

const MAX_TRACKED_COURSES = 64;
const RESERVED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const CourseSlugSchema = z
  .string()
  .min(1)
  .max(CONTRACT_LIMITS.shortText)
  .refine((value) => !RESERVED_KEYS.has(value), { message: 'RESERVED_COURSE_SLUG' });

const IsoTimestampSchema = z
  .string()
  .max(CONTRACT_LIMITS.shortText)
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'INVALID_TIMESTAMP' });

export const LearningVerificationRecordSchema = z
  .object({
    sessionId: z.string().min(1).max(CONTRACT_LIMITS.shortText),
    topic: z.string().min(1).max(CONTRACT_LIMITS.shortText),
    score: z.number().min(0).max(CONTRACT_LIMITS.percentage).nullable(),
    answerCount: z.number().int().min(0),
    recordedAt: IsoTimestampSchema,
  })
  .strict();

export const LearningProgressStateSchema = z
  .object({
    completedSlugs: z.array(CourseSlugSchema).max(MAX_TRACKED_COURSES),
    lastOpenedSlug: CourseSlugSchema.nullable(),
    verificationByCourse: z
      .record(CourseSlugSchema, LearningVerificationRecordSchema)
      .refine((value) => Object.keys(value).length <= MAX_TRACKED_COURSES, {
        message: 'TOO_MANY_COURSES',
      }),
  })
  .strict();

export const UserLearningProgressSchema = LearningProgressStateSchema.extend({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  updatedAt: IsoTimestampSchema,
});

export const UserLearningProgressPayloadSchema = z
  .object({
    progress: UserLearningProgressSchema.nullable(),
  })
  .strict();

export const UpsertLearningProgressInputSchema = LearningProgressStateSchema;

export type LearningVerificationRecord = z.infer<typeof LearningVerificationRecordSchema>;
export type LearningProgressState = z.infer<typeof LearningProgressStateSchema>;
export type UserLearningProgress = z.infer<typeof UserLearningProgressSchema>;
export type UserLearningProgressPayload = z.infer<typeof UserLearningProgressPayloadSchema>;
export type UpsertLearningProgressInput = z.infer<typeof UpsertLearningProgressInputSchema>;
