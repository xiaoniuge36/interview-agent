import { z } from 'zod';
import { CONTRACT_LIMITS } from '../limits';

const RETRIEVAL_QUERY_MAX = 4_000;
const RETRIEVAL_LIMIT_MAX = 20;
const RETRIEVAL_LIMIT_DEFAULT = 8;

export const RetrievalPurposeSchema = z.enum(['training', 'interview', 'report']);
export const RetrievalSourceSchema = z.enum(['keyword', 'vector', 'hybrid']);
export const RetrievalQuerySchema = z.object({
  query: z.string().trim().min(1).max(RETRIEVAL_QUERY_MAX),
  purpose: RetrievalPurposeSchema,
  limit: z.coerce.number().int().min(1).max(RETRIEVAL_LIMIT_MAX).default(RETRIEVAL_LIMIT_DEFAULT),
});
export const RetrievalHitSchema = z.object({
  id: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  tenantId: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  entityType: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  entityId: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  content: z.string().min(1).max(CONTRACT_LIMITS.mediumText),
  score: z.number().min(0).max(1),
  source: RetrievalSourceSchema,
  metadata: z.record(z.unknown()),
});
export const RetrievalResponseSchema = z.object({
  hits: z.array(RetrievalHitSchema).max(RETRIEVAL_LIMIT_MAX),
});

export type RetrievalPurpose = z.infer<typeof RetrievalPurposeSchema>;
export type RetrievalQuery = z.infer<typeof RetrievalQuerySchema>;
export type RetrievalHit = z.infer<typeof RetrievalHitSchema>;
export type RetrievalResponse = z.infer<typeof RetrievalResponseSchema>;
