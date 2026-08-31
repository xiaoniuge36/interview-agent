import { z } from 'zod';

import { decodeCanonicalBase64 } from '../security/base64-key';

const MAX_NETWORK_PORT = 65_535;
const DEFAULT_API_PORT = 3_001;
const MIN_THROTTLE_TTL_MS = 1_000;
const MAX_THROTTLE_TTL_MS = 3_600_000;
const DEFAULT_THROTTLE_TTL_MS = 60_000;
const MAX_THROTTLE_REQUESTS = 10_000;
const DEFAULT_THROTTLE_REQUESTS = 120;
const DEFAULT_AI_THROTTLE_REQUESTS = 30;
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
const MIN_BACKGROUND_JOB_POLL_INTERVAL_MS = 100;
const MAX_BACKGROUND_JOB_POLL_INTERVAL_MS = 300_000;
const DEFAULT_BACKGROUND_JOB_POLL_INTERVAL_MS = 10_000;
const MIN_INTERNAL_TOKEN_LENGTH = 24;
const MIN_HS256_SECRET_BYTES = 32;
const CREDENTIAL_ENCRYPTION_KEY_BYTES = 32;
const DEFAULT_CIRCUIT_FAILURE_THRESHOLD = 3;
const DEFAULT_CIRCUIT_COOLDOWN_MS = 30_000;
const DEFAULT_HALF_OPEN_PROBES = 1;

const BooleanEnvironmentSchema = z.enum(['true', 'false']).transform((value) => value === 'true');
const OptionalNonEmptyEnvironmentSchema = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1).optional(),
);

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
    // 昂贵 AI 接口（LLM/Embedding）单独限流：默认远严于全局，保护模型成本
    API_AI_THROTTLE_LIMIT: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_THROTTLE_REQUESTS)
      .default(DEFAULT_AI_THROTTLE_REQUESTS),
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
    BACKGROUND_JOB_WORKER_ENABLED: BooleanEnvironmentSchema.default('false'),
    RAG_TRAINING_ENABLED: BooleanEnvironmentSchema.default('false'),
    RAG_INTERVIEW_ENABLED: BooleanEnvironmentSchema.default('false'),
    RAG_REPORT_ENABLED: BooleanEnvironmentSchema.default('false'),
    BACKGROUND_JOB_POLL_INTERVAL_MS: z.coerce
      .number()
      .int()
      .min(MIN_BACKGROUND_JOB_POLL_INTERVAL_MS)
      .max(MAX_BACKGROUND_JOB_POLL_INTERVAL_MS)
      .default(DEFAULT_BACKGROUND_JOB_POLL_INTERVAL_MS),
    INTERVIEW_COMMAND_LEASE_MS: z.coerce
      .number()
      .int()
      .min(MIN_COMMAND_LEASE_MS)
      .max(MAX_COMMAND_LEASE_MS)
      .default(DEFAULT_COMMAND_LEASE_MS),
    INTERNAL_AGENT_TOKEN: z.string().min(MIN_INTERNAL_TOKEN_LENGTH),
    CREDENTIAL_ENCRYPTION_KEY: z.string().min(1).optional(),
    CREDENTIAL_ENCRYPTION_KEY_CURRENT: z.string().min(1).optional(),
    CREDENTIAL_ENCRYPTION_KEY_PREVIOUS: OptionalNonEmptyEnvironmentSchema,
    CREDENTIAL_ENCRYPTION_KEY_VERSION: z.coerce.number().int().min(1).default(1),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
    OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
    NEXT_PUBLIC_OIDC_CLIENT_ID: z.string().min(1).optional(),
    NEXT_PUBLIC_ADMIN_OIDC_CLIENT_ID: z.string().min(1).optional(),
    AI_CIRCUIT_FAILURE_THRESHOLD: z.coerce
      .number()
      .int()
      .min(1)
      .default(DEFAULT_CIRCUIT_FAILURE_THRESHOLD),
    AI_CIRCUIT_COOLDOWN_MS: z.coerce.number().int().min(1).default(DEFAULT_CIRCUIT_COOLDOWN_MS),
    AI_CIRCUIT_HALF_OPEN_MAX_PROBES: z.coerce
      .number()
      .int()
      .min(1)
      .default(DEFAULT_HALF_OPEN_PROBES),
  })
  .superRefine((environment, context) => {
    validateAuthentication(environment, context);
    validateCredentialKeys(environment, context);
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
  validateProductionRedis(environment, context);
  if (environment.AGENT_RUNTIME_FALLBACK_ENABLED) {
    addIssue(context, 'AGENT_RUNTIME_FALLBACK_ENABLED', '生产环境禁止启用本地 Runtime 降级。');
  }
  if (environment.API_CORS_ORIGINS.length === 0) {
    addIssue(context, 'API_CORS_ORIGINS', '生产环境必须显式配置 CORS 来源。');
  }
  if (environment.API_CORS_ORIGINS.some(isExampleUrl)) {
    addIssue(context, 'API_CORS_ORIGINS', '生产环境 CORS 不得使用示例域名。');
  }
  if (!environment.CREDENTIAL_ENCRYPTION_KEY_CURRENT) {
    addIssue(context, 'CREDENTIAL_ENCRYPTION_KEY_CURRENT', '生产环境必须配置当前凭证加密密钥。');
  }
  if (environment.OTEL_EXPORTER_OTLP_ENDPOINT && !environment.OTEL_EXPORTER_OTLP_HEADERS?.trim()) {
    addIssue(context, 'OTEL_EXPORTER_OTLP_HEADERS', '生产环境 OTLP 导出必须配置认证头。');
  }
  validateProductionOidcClients(environment, context);
}

function validateProductionRedis(environment: Environment, context: z.RefinementCtx) {
  if (!environment.REDIS_REQUIRED) {
    addIssue(context, 'REDIS_REQUIRED', '生产环境必须启用 Redis（REDIS_REQUIRED 不得为 false）。');
  }
}

function validateProductionOidcClients(environment: Environment, context: z.RefinementCtx) {
  if (environment.AUTH_MODE !== 'oidc') return;
  if (!environment.NEXT_PUBLIC_OIDC_CLIENT_ID) {
    addIssue(context, 'NEXT_PUBLIC_OIDC_CLIENT_ID', '生产环境 OIDC 必须配置用户端 client id。');
  }
  if (!environment.NEXT_PUBLIC_ADMIN_OIDC_CLIENT_ID) {
    addIssue(
      context,
      'NEXT_PUBLIC_ADMIN_OIDC_CLIENT_ID',
      '生产环境 OIDC 必须配置管理端 client id。',
    );
  }
  if (
    environment.NEXT_PUBLIC_OIDC_CLIENT_ID &&
    environment.NEXT_PUBLIC_OIDC_CLIENT_ID === environment.NEXT_PUBLIC_ADMIN_OIDC_CLIENT_ID
  ) {
    addIssue(
      context,
      'NEXT_PUBLIC_ADMIN_OIDC_CLIENT_ID',
      '用户端与管理端不得共用 OIDC client id。',
    );
  }
}

function validateCredentialKeys(environment: Environment, context: z.RefinementCtx) {
  const current =
    environment.CREDENTIAL_ENCRYPTION_KEY_CURRENT ?? environment.CREDENTIAL_ENCRYPTION_KEY;
  if (!isCredentialKey(current)) {
    addIssue(
      context,
      'CREDENTIAL_ENCRYPTION_KEY_CURRENT',
      '凭证加密主密钥必须是 32 字节 base64 值。',
    );
  }
  if (
    environment.CREDENTIAL_ENCRYPTION_KEY_PREVIOUS &&
    !isCredentialKey(environment.CREDENTIAL_ENCRYPTION_KEY_PREVIOUS)
  ) {
    addIssue(
      context,
      'CREDENTIAL_ENCRYPTION_KEY_PREVIOUS',
      '上一版本凭证加密密钥必须是 32 字节 base64 值。',
    );
  }
}

function isExampleUrl(value: string) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === 'example.com' || hostname.endsWith('.example.com');
  } catch {
    return true;
  }
}

function isCredentialKey(value: string | undefined) {
  const decoded = value ? decodeCanonicalBase64(value) : undefined;
  return decoded?.length === CREDENTIAL_ENCRYPTION_KEY_BYTES;
}

export function validateEnvironment(configuration: Record<string, unknown>): Environment {
  const parsed = EnvironmentSchema.safeParse(withProductionRedisDefault(configuration));
  if (parsed.success) return parsed.data;
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
    .join('; ');
  throw new Error(`环境变量校验失败：${details}`);
}

function withProductionRedisDefault(configuration: Record<string, unknown>) {
  if (configuration.NODE_ENV !== 'production') return configuration;
  return { REDIS_REQUIRED: 'true', ...configuration };
}
