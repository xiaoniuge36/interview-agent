import { describe, expect, it } from 'vitest';
import { AuthConfigurationError, AuthRequiredError } from '../src/errors';
import { buildAuthHeaders } from '../src/headers';
import { parseAuthMode } from '../src/mode';

describe('buildAuthHeaders', () => {
  it('development 模式仅发送开发身份头', () => {
    const headers = buildAuthHeaders({
      mode: 'development',
      developmentActor: 'admin',
    });
    expect(headers.get('x-development-actor')).toBe('admin');
    expect(headers.has('Authorization')).toBe(false);
  });

  it('oidc 模式仅发送 bearer token', () => {
    const headers = buildAuthHeaders({
      mode: 'oidc',
      developmentActor: 'user',
      accessToken: 'access-token',
    });
    expect(headers.get('Authorization')).toBe('Bearer access-token');
    expect(headers.has('x-development-actor')).toBe(false);
  });

  it('oidc 模式拒绝空 token', () => {
    expect(() =>
      buildAuthHeaders({
        mode: 'oidc',
        developmentActor: 'user',
      }),
    ).toThrow(AuthRequiredError);
  });
});

describe('parseAuthMode', () => {
  it('默认使用 development', () => {
    expect(parseAuthMode(undefined)).toBe('development');
  });

  it('拒绝未知认证模式', () => {
    expect(() => parseAuthMode('legacy')).toThrow(AuthConfigurationError);
  });
});
