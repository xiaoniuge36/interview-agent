import { describe, expect, it } from 'vitest';
import {
  createLocalAdminRequest,
  createAccountExportRequest,
  createAccountQueryRequest,
  createResetLocalPasswordRequest,
} from './account-api';

describe('account governance API requests', () => {
  it('sends local administrator creation as a POST body', () => {
    expect(
      createLocalAdminRequest({
        name: 'Platform Admin',
        email: 'PLATFORM.ADMIN@example.com',
        password: 'initial-password',
        role: 'platform_admin',
      }),
    ).toMatchObject({
      path: '/admin/accounts/local-admin',
      init: {
        method: 'POST',
        body: JSON.stringify({
          name: 'Platform Admin',
          email: 'platform.admin@example.com',
          password: 'initial-password',
          role: 'platform_admin',
        }),
      },
    });
  });

  it('serializes submitted filters and server pagination for queries', () => {
    const request = createAccountQueryRequest({
      keyword: '  Avery  ',
      tenantKeyword: '  platform  ',
      role: 'platform_admin',
      status: 'active',
      page: 2,
      pageSize: 50,
    });

    expect(request.path).toBe(
      '/admin/accounts/query?page=2&pageSize=50&keyword=Avery&role=platform_admin&status=active&tenantKeyword=platform',
    );
  });

  it('exports all submitted filters and never includes a page cursor', () => {
    const request = createAccountExportRequest({ kind: 'admin', authSource: 'local', page: 5 });

    expect(request.path).toBe('/admin/accounts/export?kind=admin&authSource=local');
    expect(request.fallbackFileName).toBe('accounts.csv');
  });

  it('sends password resets as JSON PATCH bodies', () => {
    expect(createResetLocalPasswordRequest('user-1', { password: 'next-password' })).toMatchObject({
      path: '/admin/accounts/user-1/local-password',
      init: { method: 'PATCH', body: '{"password":"next-password"}' },
    });
  });
});
