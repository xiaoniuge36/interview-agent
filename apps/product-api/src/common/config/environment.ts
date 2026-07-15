import { z } from 'zod';

const MAX_NETWORK_PORT = 65_535;
const DEFAULT_API_PORT = 3_001;
const MIN_THROTTLE_TTL_MS = 1_000;
const MAX_THROTTLE_TTL_MS = 3_600_000;
const DEFAULT_THROTTLE_TTL_MS = 60_000;
const MAX_THROTTLE_REQUESTS = 10_000;
const DEFAULT_THROTTLE_REQUESTS = 120;
const MIN_RUNTIME_TIMEOUT_MS = 500;
const MAX_RUNTIME_TIMEOUT_MS = 60_000;
const DEFAULT_RUNTIME_TIMEOUT_MS = 8_000;
const MAX_RUNTIME_ATTEMPTS = 5;
const MIN_RUNTIME_RETRY_DELAY_MS = 50;
const MAX_RUNTIME_RETRY_DELAY_MS = 5_000;
const DEFAULT_RUNTIME_RETRY_DELAY_MS = 250;
const MIN_COMMAND_LEASE_MS = 10_000;
const MAX_COMMAND_LEASE_MS = 900_000;
const DEFAULT_COMMAND_LEASE_MS = 360_000;
const MIN_INTERNAL_TOKEN_LENGTH = 24;
const MIN_HS256_SECRET_BYTES = 32;
const CREDENTIAL_ENCRYPTION_KEY_BYTES = 32;

const BooleanEnvironmentSchema = z.enum(['true', 'false']).transform((value) => value === 'true');

const CsvEnvironmentSchema = z
  .string()
  .default('')
  .transform((value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );

const EnvironmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_HOST: z.string().min(1).default('0.0.0.0'),
    API_PORT: z.coerce.number().int().min(1).max(MAX_NETWORK_PORT).default(DEFAULT_API_PORT),
    API_BODY_LIMIT: z
      .string()
      .regex(/^\d+(kb|mb)$/i)
      .default('1mb'),
    API_CORS_ORIGINS: CsvEnvironmentSchema,
    API_SWAGGER_ENABLED: BooleanEnvironmentSchema.default('false'),
    API_THROTTLE_TTL_MS: z.coerce
      .number()
      .int()
      .min(MIN_THROTTLE_TTL_MS)
      .max(MAX_THROTTLE_TTL_MS)
      .default(DEFAULT_THROTTLE_TTL_MS),
    API_THROTTLE_LIMIT: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_THROTTLE_REQUESTS)
      .default(DEFAULT_THROTTLE_REQUESTS),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    REDIS_REQUIRED: BooleanEnvironmentSchema.default('false'),
    AUTH_MODE: z.enum(['development', 'jwt_hs256', 'oidc']).default('development'),
    JWT_SECRET: z.string().optional(),
    JWT_ISSUER: z.string().min(1).optional(),
    JWT_AUDIENCE: z.string().min(1).optional(),
    OIDC_ISSUER_URL: z.string().url().optional(),
    OIDC_JWKS_URL: z.string().url().optional(),
    OIDC_AUDIENCE: z.string().min(1).optional(),
    AGENT_RUNTIME_URL: z.string().url(),
    AGENT_RUNTIME_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(MIN_RUNTIME_TIMEOUT_MS)
      .max(MAX_RUNTIME_TIMEOUT_MS)
      .default(DEFAULT_RUNTIME_TIMEOUT_MS),
    AGENT_RUNTIME_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(MAX_RUNTIME_ATTEMPTS).default(2),
    AGENT_RUNTIME_RETRY_BASE_MS: z.coerce
      .number()
      .int()
      .min(MIN_RUNTIME_RETRY_DELAY_MS)
      .max(MAX_RUNTIME_RETRY_DELAY_MS)
      .default(DEFAULT_RUNTIME_RETRY_DELAY_MS),
    AGENT_RUNTIME_FALLBACK_ENABLED: BooleanEnvironmentSchema.default('false'),
    INTERVIEW_COMMAND_LEASE_MS: z.coerce
      .number()
      .int()
      .min(MIN_COMMAND_LEASE_MS)
      .max(MAX_COMMAND_LEASE_MS)
      .default(DEFAULT_COMMAND_LEASE_MS),
    INTERNAL_AGENT_TOKEN: z.string().min(MIN_INTERNAL_TOKEN_LENGTH),
    CREDENTIAL_ENCRYPTION_KEY: z.string().min(1),
    CREDENTIAL_ENCRYPTION_KEY_VERSION: z.coerce.number().int().min(1).default(1),
  })
  .superRefine((environment, context) => {
    validateAuthentication(environment, context);
    validateProduction(environment, context);
  });

export type Environment = z.output<typeof EnvironmentSchema>;

function addIssue(context: z.RefinementCtx, path: string, message: string) {
  context.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
}

function validateAuthentication(environment: Environment, context: z.RefinementCtx) {
  if (environment.AUTH_MODE === 'jwt_hs256') {
    if (
      !environment.JWT_SECRET ||
      Buffer.byteLength(environment.JWT_SECRET) < MIN_HS256_SECRET_BYTES
    ) {
      addIssue(context, 'JWT_SECRET', 'HS256 密钥必须至少为 32 字节。');
    }
    if (!environment.JWT_ISSUER) addIssue(context, 'JWT_ISSUER', 'HS256 模式必须配置签发方。');
    if (!environment.JWT_AUDIENCE) addIssue(context, 'JWT_AUDIENCE', 'HS256 模式必须配置受众。');
  }

  if (environment.AUTH_MODE === 'oidc') {
    if (!environment.OIDC_ISSUER_URL)
      addIssue(context, 'OIDC_ISSUER_URL', 'OIDC 模式必须配置签发方 URL。');
    if (!environment.OIDC_JWKS_URL)
      addIssue(context, 'OIDC_JWKS_URL', 'OIDC 模式必须配置 JWKS URL。');
    if (!environment.OIDC_AUDIENCE) addIssue(context, 'OIDC_AUDIENCE', 'OIDC 模式必须配置受众。');
  }
}

function validateProduction(environment: Environment, context: z.RefinementCtx) {
  if (environment.NODE_ENV !== 'production') return;
  if (environment.AUTH_MODE === 'development') {
    addIssue(context, 'AUTH_MODE', '生产环境禁止使用 development 认证模式。');
  }
  if (environment.AGENT_RUNTIME_FALLBACK_ENABLED) {
    addIssue(context, 'AGENT_RUNTIME_FALLBACK_ENABLED', '生产环境禁止启用本地 Runtime 降级。');
  }
  if (environment.API_CORS_ORIGINS.length === 0) {
    addIssue(context, 'API_CORS_ORIGINS', '生产环境必须显式配置 CORS 来源。');
  }
  if (decodeCredentialKey(environment.CREDENTIAL_ENCRYPTION_KEY).length !== CREDENTIAL_ENCRYPTION_KEY_BYTES) {
    addIssue(context, 'CREDENTIAL_ENCRYPTION_KEY', '凭证加密主密钥必须是 32 字节 base64 值。');
  }
}

function decodeCredentialKey(value: string) {
  try {
    return Buffer.from(value, 'base64');
  } catch {
    return Buffer.alloc(0);
  }
}

export function validateEnvironment(configuration: Record<string, unknown>): Environment {
  const parsed = EnvironmentSchema.safeParse(configuration);
  if (parsed.success) return parsed.data;
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
    .join('; ');
  throw new Error(`环境变量校验失败：${details}`);
}
