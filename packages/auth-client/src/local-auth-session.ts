import { AuthConfigurationError } from './errors';
import type { AuthIdentity, AuthState, LocalRegistrationInput, LocalSignInInput } from './types';

const LOCAL_SESSION_KEY = 'interview-agent.local-session';

type LocalSession = {
  accessToken: string;
  expiresAt: string;
  identity: Required<AuthIdentity>;
};

type LocalAuthPath = '/auth/login' | '/auth/register';

export async function requestLocalSession(
  apiBaseUrl: string,
  path: LocalAuthPath,
  body: LocalSignInInput | LocalRegistrationInput,
): Promise<LocalSession> {
  const response = await fetch(apiBaseUrl + path, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(responseMessage(payload));
  return parseLocalSession(payload);
}

export function localState(): AuthState {
  // SSR 无 windowStorage：返回 loading，等客户端 hydrate 后再读会话
  if (typeof window === 'undefined') {
    return { status: 'loading', identity: null, error: null };
  }
  const session = readLocalSession();
  return session
    ? { status: 'authenticated', identity: session.identity, error: null }
    : { status: 'unauthenticated', identity: null, error: null };
}

export function persistLocalSession(session: LocalSession): AuthState {
  browserSessionStorage().setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
  return { status: 'authenticated', identity: session.identity, error: null };
}

export function readLocalSession(): LocalSession | null {
  if (typeof window === 'undefined') return null;
  const raw = browserSessionStorage().getItem(LOCAL_SESSION_KEY);
  if (!raw) return null;
  try {
    const session = parseLocalSession(JSON.parse(raw));
    if (Date.parse(session.expiresAt) > Date.now()) return session;
  } catch {
    // 无效或过期会话不能继续作为授权凭据使用。
  }
  clearLocalSession();
  return null;
}

export function clearLocalSession() {
  if (typeof window === 'undefined') return;
  browserSessionStorage().removeItem(LOCAL_SESSION_KEY);
}

function parseLocalSession(payload: unknown): LocalSession {
  const object = record(payload);
  const identity = record(object.identity);
  const accessToken = requiredString(object.accessToken, '本地登录响应缺少访问令牌。');
  const expiresAt = requiredString(object.expiresAt, '本地登录响应缺少过期时间。');
  if (!Number.isFinite(Date.parse(expiresAt))) {
    throw new AuthConfigurationError('本地登录响应包含无效过期时间。');
  }
  return {
    accessToken,
    expiresAt,
    identity: {
      subject: requiredString(identity.subject, '本地登录响应缺少用户标识。'),
      displayName: requiredString(identity.displayName, '本地登录响应缺少用户名。'),
      role: requiredString(identity.role, '本地登录响应缺少角色。'),
    },
  };
}

function responseMessage(payload: unknown): string {
  if (!isRecord(payload)) return '登录服务暂时不可用，请稍后重试。';
  const error = payload.error;
  if (isRecord(error) && hasText(error.message)) return error.message.trim();
  if (hasText(payload.message)) return payload.message.trim();
  if (Array.isArray(payload.message)) {
    const messages = payload.message.filter(hasText).map((message) => message.trim());
    if (messages.length) return messages.join('；');
  }
  return '登录服务暂时不可用，请稍后重试。';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value.trim());
}

function record(value: unknown): Record<string, unknown> {
  if (isRecord(value)) return value;
  throw new AuthConfigurationError('认证服务返回的数据格式无效。');
}

function requiredString(value: unknown, message: string): string {
  return typeof value === 'string' && value.trim() ? value : throwConfiguration(message);
}

function throwConfiguration(message: string): never {
  throw new AuthConfigurationError(message);
}

export function browserSessionStorage(): Storage {
  if (typeof window === 'undefined') {
    throw new AuthConfigurationError('浏览器认证客户端只能在客户端运行。');
  }
  return window.sessionStorage;
}
