import { CONTRACT_LIMITS } from '@interview-agent/contracts';
import { z } from 'zod';

const MIN_GRANT_LENGTH = 16;
const MAX_GRANT_LENGTH = 4096;

export const ModelGatewayRequestSchema = z.object({
  grant: z.string().trim().min(MIN_GRANT_LENGTH).max(MAX_GRANT_LENGTH),
  systemPrompt: z.string().min(1).max(CONTRACT_LIMITS.longText),
  userPrompt: z.string().min(1).max(CONTRACT_LIMITS.longText),
  outputSchemaVersion: z.literal('interview-runtime.v1'),
  traceId: z.string().min(CONTRACT_LIMITS.traceIdMinLength).max(CONTRACT_LIMITS.traceIdMaxLength),
});

export type ModelGatewayRequest = z.infer<typeof ModelGatewayRequestSchema>;
