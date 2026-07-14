import { describe, expect, it } from 'vitest';
import { getAuthenticationRecovery } from './admin-session';

describe('admin authentication recovery', () => {
  it('本地会话失效时返回登录页，而不是重复发送无效 token', () => {
    expect(getAuthenticationRecovery('local')).toEqual({
      action: 'sign-out',
      label: '返回登录',
    });
  });

  it('OIDC 会话失效时重新发起登录，开发模式才允许直接重载', () => {
    expect(getAuthenticationRecovery('oidc')).toEqual({
      action: 'sign-in',
      label: '重新登录',
    });
    expect(getAuthenticationRecovery('development')).toEqual({
      action: 'reload',
      label: '重新加载',
    });
  });
});
