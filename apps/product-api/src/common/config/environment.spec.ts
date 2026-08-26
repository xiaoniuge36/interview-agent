import { validateEnvironment } from './environment';

const VALID_KEY = Buffer.alloc(32, 7).toString('base64');

describe('production environment guardrails', () => {
  it('rejects development authentication and empty CORS', () => {
    expect(() => validateEnvironment(production({ AUTH_MODE: 'development' }))).toThrow(
      '生产环境禁止使用 development 认证模式',
    );
    expect(() => validateEnvironment(production({ API_CORS_ORIGINS: '' }))).toThrow(
      '生产环境必须显式配置 CORS 来源',
    );
  });

  it('rejects example origins and an OTLP endpoint without authentication headers', () => {
    expect(() =>
      validateEnvironment(production({ API_CORS_ORIGINS: 'https://app.example.com' })),
    ).toThrow('生产环境 CORS 不得使用示例域名');
    expect(() => validateEnvironment(production({ OTEL_EXPORTER_OTLP_HEADERS: '' }))).toThrow(
      '生产环境 OTLP 导出必须配置认证头',
    );
  });

  it('allows an empty previous credential key during the initial key version', () => {
    expect(() =>
      validateEnvironment(production({ CREDENTIAL_ENCRYPTION_KEY_PREVIOUS: '' })),
    ).not.toThrow();
  });

  it('rejects a non-canonical base64 credential key', () => {
    expect(() =>
      validateEnvironment(production({ CREDENTIAL_ENCRYPTION_KEY_CURRENT: `${VALID_KEY}!` })),
    ).toThrow('凭证加密主密钥必须是 32 字节 base64 值');
  });

  it('defaults REDIS_REQUIRED to true in production and rejects an explicit opt-out', () => {
    expect(validateEnvironment(production()).REDIS_REQUIRED).toBe(true);
    expect(() => validateEnvironment(production({ REDIS_REQUIRED: 'false' }))).toThrow(
      '生产环境必须启用 Redis',
    );
  });

  it('keeps REDIS_REQUIRED optional outside production', () => {
    expect(validateEnvironment(development()).REDIS_REQUIRED).toBe(false);
    expect(validateEnvironment(development({ REDIS_REQUIRED: 'true' })).REDIS_REQUIRED).toBe(true);
  });
});

describe('production OIDC client guardrails', () => {
  it('rejects a shared OIDC client id for user and admin applications', () => {
    expect(() =>
      validateEnvironment(
        production({
          AUTH_MODE: 'oidc',
          OIDC_ISSUER_URL: 'https://identity.company.test',
          OIDC_JWKS_URL: 'https://identity.company.test/jwks.json',
          OIDC_AUDIENCE: 'interview-agent',
          NEXT_PUBLIC_OIDC_CLIENT_ID: 'shared-client',
          NEXT_PUBLIC_ADMIN_OIDC_CLIENT_ID: 'shared-client',
        }),
      ),
    ).toThrow('用户端与管理端不得共用 OIDC client id');
  });

  it('requires separate user and admin client ids in production OIDC mode', () => {
    const oidc = {
      AUTH_MODE: 'oidc',
      OIDC_ISSUER_URL: 'https://identity.company.test',
      OIDC_JWKS_URL: 'https://identity.company.test/jwks.json',
      OIDC_AUDIENCE: 'interview-agent',
    };

    expect(() => validateEnvironment(production(oidc))).toThrow(
      '生产环境 OIDC 必须配置用户端 client id',
    );
    expect(() =>
      validateEnvironment(
        production({ ...oidc, NEXT_PUBLIC_OIDC_CLIENT_ID: 'interview-agent-web' }),
      ),
    ).toThrow('生产环境 OIDC 必须配置管理端 client id');
  });
});

function development(overrides: Record<string, unknown> = {}) {
  return {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://user:password@localhost:5432/interview_agent',
    REDIS_URL: 'redis://localhost:6379',
    AGENT_RUNTIME_URL: 'http://localhost:8100',
    INTERNAL_AGENT_TOKEN: 'development-internal-agent-token',
    CREDENTIAL_ENCRYPTION_KEY: VALID_KEY,
    ...overrides,
  };
}

function production(overrides: Record<string, unknown> = {}) {
  return {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://user:password@database.company.test:5432/interview_agent',
    REDIS_URL: 'redis://redis.company.test:6379',
    AUTH_MODE: 'jwt_hs256',
    JWT_SECRET: 'production-secret-with-at-least-32-characters',
    JWT_ISSUER: 'interview-agent',
    JWT_AUDIENCE: 'interview-agent-web',
    API_CORS_ORIGINS: 'https://app.company.test,https://admin.company.test',
    AGENT_RUNTIME_URL: 'https://runtime.company.test',
    AGENT_RUNTIME_FALLBACK_ENABLED: 'false',
    INTERNAL_AGENT_TOKEN: 'production-internal-agent-token',
    CREDENTIAL_ENCRYPTION_KEY: VALID_KEY,
    CREDENTIAL_ENCRYPTION_KEY_CURRENT: VALID_KEY,
    CREDENTIAL_ENCRYPTION_KEY_VERSION: '2',
    OTEL_EXPORTER_OTLP_ENDPOINT: 'https://otel.company.test',
    OTEL_EXPORTER_OTLP_HEADERS: 'authorization=Bearer production-token',
    ...overrides,
  };
}
