import { z } from 'zod';

export const ApiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.unknown().optional(),
  }),
  requestId: z.string().min(1),
  traceId: z.string().min(1),
  timestamp: z.string().datetime(),
});

export const LivenessSchema = z.object({
  status: z.literal('ok'),
  service: z.string().min(1),
  time: z.string().datetime(),
});

export const ReadinessSchema = z.object({
  status: z.enum(['ready', 'not_ready']),
  service: z.string().min(1),
  time: z.string().datetime(),
  checks: z.record(
    z.object({
      status: z.enum(['up', 'down']),
      latencyMs: z.number().int().nonnegative(),
      message: z.string().optional(),
    }),
  ),
});

export type ApiErrorEnvelope = z.infer<typeof ApiErrorEnvelopeSchema>;
export type Liveness = z.infer<typeof LivenessSchema>;
export type Readiness = z.infer<typeof ReadinessSchema>;
