import { z } from 'zod';
import { CONTRACT_LIMITS } from '../limits';
import { InterviewCommandResultSchema } from './interview';
import { PracticeItemFeedbackSchema } from './practice';

const StreamMetadataSchema = z.object({
  operationId: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  occurredAt: z.string().datetime(),
  traceId: z.string().min(CONTRACT_LIMITS.traceIdMinLength).max(CONTRACT_LIMITS.traceIdMaxLength),
});

export const AiOperationPhaseSchema = z.enum([
  'preparing',
  'analyzing',
  'composing',
  'validating',
  'saving',
]);

export const AiOperationPhaseEventSchema = StreamMetadataSchema.extend({
  type: z.literal('phase'),
  phase: AiOperationPhaseSchema,
  label: z.string().min(1).max(CONTRACT_LIMITS.mediumText),
});

export const AiOperationDeltaEventSchema = StreamMetadataSchema.extend({
  type: z.literal('delta'),
  channel: z.enum(['interviewer_content', 'evaluation_feedback']),
  content: z.string().min(1).max(CONTRACT_LIMITS.mediumText),
});

export const AiOperationInterviewResultEventSchema = StreamMetadataSchema.extend({
  type: z.literal('result'),
  operation: z.literal('interview_next'),
  result: InterviewCommandResultSchema,
  basisSummary: z.array(z.string().min(1).max(CONTRACT_LIMITS.mediumText)).max(3),
});

export const AiOperationPracticeResultEventSchema = StreamMetadataSchema.extend({
  type: z.literal('result'),
  operation: z.literal('practice_evaluation'),
  result: PracticeItemFeedbackSchema,
});

export const AiOperationErrorEventSchema = StreamMetadataSchema.extend({
  type: z.literal('error'),
  code: z.string().min(1).max(CONTRACT_LIMITS.errorCode),
  message: z.string().min(1).max(CONTRACT_LIMITS.mediumText),
  requestId: z.string().min(1).max(CONTRACT_LIMITS.shortText).optional(),
  retryable: z.boolean(),
});

export const AiOperationResultEventSchema = z.union([
  AiOperationInterviewResultEventSchema,
  AiOperationPracticeResultEventSchema,
]);

export const AiOperationStreamEventSchema = z.union([
  AiOperationPhaseEventSchema,
  AiOperationDeltaEventSchema,
  AiOperationResultEventSchema,
  AiOperationErrorEventSchema,
]);

export type AiOperationPhase = z.infer<typeof AiOperationPhaseSchema>;
export type AiOperationStreamEvent = z.infer<typeof AiOperationStreamEventSchema>;
export type AiOperationResultEvent = z.infer<typeof AiOperationResultEventSchema>;
