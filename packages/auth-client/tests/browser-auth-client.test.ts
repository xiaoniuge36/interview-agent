import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserAuthClient } from '../src/browser-auth-client';
import { AuthRequiredError } from '../src/errors';

const LOCAL_SESSION_KEY = 'interview-agent.local-session';
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

let sessionStorage: Storage;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  sessionStorage = memoryStorage();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { sessionStorage },
  });
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
});

describe('BrowserAuthClient local registration', () => {
  it('注册后保存会话，并为后续 API 请求提供 Bearer token', async () => {
    fetchMock.mockResolvedValue(sessionResponse());
    const client = localClient();

    const state = await client.register({
      name: 'Avery Lin',
      email: 'avery@example.com',
      password: 'a-secure-password',
    });

    expect(state).toMatchObject({
      status: 'authenticated',
      identity: { subject: 'local:user-1', displayName: 'Avery Lin', role: 'user' },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://product-api.test/api/auth/register',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(await client.getRequestHeaders()).toMatchObject({
      get: expect.any(Function),
    });
    expect((await client.getRequestHeaders()).get('Authorization')).toBe('Bearer access-token');
    await expect(client.initialize()).resolves.toMatchObject({ status: 'authenticated' });
  });
});

describe('BrowserAuthClient expired sessions', () => {
  it('清除过期的本地会话并要求重新登录', async () => {
    sessionStorage.setItem(
      LOCAL_SESSION_KEY,
      JSON.stringify({
        accessToken: 'expired-token',
        expiresAt: '2020-01-01T00:00:00.000Z',
        identity: { subject: 'local:user-1', displayName: 'Avery Lin', role: 'user' },
      }),
    );
    const client = localClient();

    await expect(client.initialize()).resolves.toMatchObject({ status: 'unauthenticated' });
    await expect(client.getRequestHeaders()).rejects.toBeInstanceOf(AuthRequiredError);
    expect(sessionStorage.getItem(LOCAL_SESSION_KEY)).toBeNull();
  });
});

describe('BrowserAuthClient local errors', () => {
  it('将 API 返回的认证错误回显给表单', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { message: '该邮箱已注册，可直接登录。' } }), {
        status: 409,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = localClient();

    await expect(
      client.register({
        name: 'Avery Lin',
        email: 'avery@example.com',
        password: 'a-secure-password',
      }),
    ).rejects.toThrow('该邮箱已注册，可直接登录。');
  });
});

function localClient() {
  return new BrowserAuthClient({
    mode: 'local',
    developmentActor: 'user',
    apiBaseUrl: 'https://product-api.test/api',
  });
}

function sessionResponse() {
  return new Response(
    JSON.stringify({
      accessToken: 'access-token',
      expiresAt: '2099-01-01T00:00:00.000Z',
      identity: { subject: 'local:user-1', displayName: 'Avery Lin', role: 'user' },
    }),
    { status: 201, headers: { 'content-type': 'application/json' } },
  );
}

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}
