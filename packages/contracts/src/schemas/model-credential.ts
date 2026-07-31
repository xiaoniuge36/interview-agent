import { z } from 'zod';
import { CONTRACT_LIMITS } from '../limits';

const API_KEY_MIN_LENGTH = 8;
const KEY_HINT_MIN_LENGTH = 4;
const KEY_HINT_MAX_LENGTH = 16;
const PRIVATE_IPV4_PATTERNS = [
  /^0(?:\.\d{1,3}){3}$/,
  /^10(?:\.\d{1,3}){3}$/,
  /^127(?:\.\d{1,3}){3}$/,
  /^169\.254(?:\.\d{1,3}){2}$/,
  /^172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}$/,
  /^192\.0\.(?:0|2)(?:\.\d{1,3})$/,
  /^192\.88\.99(?:\.\d{1,3})$/,
  /^192\.168(?:\.\d{1,3}){2}$/,
  /^198\.(?:18|19)(?:\.\d{1,3}){2}$/,
  /^198\.51\.100(?:\.\d{1,3})$/,
  /^203\.0\.113(?:\.\d{1,3})$/,
  /^100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])(?:\.\d{1,3}){2}$/,
  /^(?:22[4-9]|23\d|24\d|25[0-5])(?:\.\d{1,3}){3}$/,
];

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
  .refine(isHttpsUrl, 'Base URL 必须使用 HTTPS。')
  .refine(isSafeModelEndpoint, 'Base URL 不允许指向本机、私网、非法端口或包含内嵌凭证。');

export const CreateModelCredentialInputSchema = z
  .object({
    provider: ModelProviderSchema,
    model: z.string().trim().min(1).max(CONTRACT_LIMITS.shortText),
    apiKey: z.string().trim().min(API_KEY_MIN_LENGTH).max(CONTRACT_LIMITS.mediumText),
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
    provider: ModelProviderSchema.optional(),
    model: z.string().trim().min(1).max(CONTRACT_LIMITS.shortText).optional(),
    apiKey: z.string().trim().min(API_KEY_MIN_LENGTH).max(CONTRACT_LIMITS.mediumText).optional(),
    baseUrl: BaseUrlSchema.nullable().optional(),
    isDefault: z.boolean().optional(),
    status: z.enum(['unverified', 'disabled']).optional(),
  })
  .superRefine((input, context) => {
    if (Object.keys(input).length === 0) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: '至少修改一项模型连接配置。' });
    }
    if (input.provider === 'openai_compatible' && !input.baseUrl) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['baseUrl'],
        message: '切换为自定义兼容端点时必须填写 Base URL。',
      });
    }
  });

export const ModelCredentialViewSchema = z.object({
  id: z.string().min(1),
  provider: ModelProviderSchema,
  model: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  baseUrl: BaseUrlSchema.nullable(),
  keyHint: z.string().min(KEY_HINT_MIN_LENGTH).max(KEY_HINT_MAX_LENGTH),
  status: ModelCredentialStatusSchema,
  isDefault: z.boolean(),
  lastTestedAt: z.string().datetime().nullable(),
  lastErrorCode: z.string().max(CONTRACT_LIMITS.errorCode).nullable(),
  updatedAt: z.string().datetime(),
});

export const ModelCredentialListSchema = z
  .array(ModelCredentialViewSchema)
  .max(CONTRACT_LIMITS.list);

export type ModelProvider = z.infer<typeof ModelProviderSchema>;
export type ModelCredentialStatus = z.infer<typeof ModelCredentialStatusSchema>;
export type CreateModelCredentialInput = z.infer<typeof CreateModelCredentialInputSchema>;
export type UpdateModelCredentialInput = z.infer<typeof UpdateModelCredentialInputSchema>;
export type ModelCredentialView = z.infer<typeof ModelCredentialViewSchema>;

function isHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isSafeModelEndpoint(value: string) {
  try {
    const url = new URL(value);
    return !url.username && !url.password && url.port !== '0' && !isPrivateHostname(url.hostname);
  } catch {
    return false;
  }
}

function isPrivateHostname(value: string) {
  const hostname = value.toLowerCase().replace(/^\[|\]$/g, '');
  if (isPrivateDomainName(hostname)) return true;
  if (hostname.includes(':')) return isPrivateIpv6(hostname);
  return isPrivateIpv4(hostname);
}

function isPrivateDomainName(hostname: string) {
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  );
}

function isPrivateIpv6(hostname: string) {
  return !/^[23][0-9a-f]{3}:/i.test(hostname) || /^2001:0?db8:/i.test(hostname);
}

function isPrivateIpv4(hostname: string) {
  return PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(hostname));
}
