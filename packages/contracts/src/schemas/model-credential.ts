import { z } from 'zod';
import { CONTRACT_LIMITS } from '../limits';

export const ModelProviderSchema = z.enum([
  'openai',
  'anthropic',
  'deepseek',
  'qwen',
  'openai_compatible',
]);

export const ModelCredentialStatusSchema = z.enum(['unverified', 'verified', 'disabled', 'failed']);

const BaseUrlSchema = z
  .string()
  .url()
  .max(CONTRACT_LIMITS.mediumText)
  .refine((value) => new URL(value).protocol === 'https:', 'Base URL 必须使用 HTTPS。');

export const CreateModelCredentialInputSchema = z
  .object({
    provider: ModelProviderSchema,
    model: z.string().trim().min(1).max(CONTRACT_LIMITS.shortText),
    apiKey: z.string().trim().min(8).max(CONTRACT_LIMITS.mediumText),
    baseUrl: BaseUrlSchema.optional(),
    isDefault: z.boolean().default(true),
  })
  .superRefine((input, context) => {
    if (input.provider === 'openai_compatible' && !input.baseUrl) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['baseUrl'],
        message: '自定义兼容端点必须填写 Base URL。',
      });
    }
  });

export const UpdateModelCredentialInputSchema = z
  .object({
    model: z.string().trim().min(1).max(CONTRACT_LIMITS.shortText).optional(),
    apiKey: z.string().trim().min(8).max(CONTRACT_LIMITS.mediumText).optional(),
    baseUrl: BaseUrlSchema.nullable().optional(),
    isDefault: z.boolean().optional(),
    status: z.enum(['unverified', 'disabled']).optional(),
  })
  .refine((input) => Object.keys(input).length > 0, '至少修改一项模型连接配置。');

export const ModelCredentialViewSchema = z.object({
  id: z.string().min(1),
  provider: ModelProviderSchema,
  model: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  baseUrl: BaseUrlSchema.nullable(),
  keyHint: z.string().min(4).max(16),
  status: ModelCredentialStatusSchema,
  isDefault: z.boolean(),
  lastTestedAt: z.string().datetime().nullable(),
  lastErrorCode: z.string().max(CONTRACT_LIMITS.errorCode).nullable(),
  updatedAt: z.string().datetime(),
});

export const ModelCredentialListSchema = z.array(ModelCredentialViewSchema).max(CONTRACT_LIMITS.list);

export type ModelProvider = z.infer<typeof ModelProviderSchema>;
export type ModelCredentialStatus = z.infer<typeof ModelCredentialStatusSchema>;
export type CreateModelCredentialInput = z.infer<typeof CreateModelCredentialInputSchema>;
export type UpdateModelCredentialInput = z.infer<typeof UpdateModelCredentialInputSchema>;
export type ModelCredentialView = z.infer<typeof ModelCredentialViewSchema>;
