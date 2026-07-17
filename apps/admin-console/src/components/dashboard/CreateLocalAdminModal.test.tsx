import { describe, expect, it } from 'vitest';
import { LOCAL_ADMIN_FORM_LABELS, LOCAL_ADMIN_ROLE_OPTIONS } from './CreateLocalAdminModal';

describe('CreateLocalAdminModal', () => {
  it('defines an initial password field and administrator-only role choices', () => {
    expect(LOCAL_ADMIN_FORM_LABELS.password).toBe('初始密码');
    expect(LOCAL_ADMIN_ROLE_OPTIONS).toEqual([
      { label: '平台管理员', value: 'platform_admin' },
      { label: '租户管理员', value: 'admin' },
    ]);
  });
});
