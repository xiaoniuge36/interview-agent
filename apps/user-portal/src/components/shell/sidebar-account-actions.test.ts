import { describe, expect, it } from 'vitest';
import { sidebarAccountActions } from './sidebar-account-actions';

describe('侧栏账户操作', () => {
  it('本地登录和 OIDC 登录始终提供退出登录', () => {
    expect(sidebarAccountActions('local')).toEqual(['settings', 'sign_out']);
    expect(sidebarAccountActions('oidc')).toEqual(['settings', 'sign_out']);
  });

  it('开发模拟身份不显示无效的退出操作', () => {
    expect(sidebarAccountActions('development')).toEqual(['settings']);
  });
});
