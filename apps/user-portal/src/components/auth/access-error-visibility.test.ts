import { describe, expect, it } from 'vitest';
import { resolveAccessError } from './access-error';

describe('local access error visibility', () => {
  it('shows an authentication error only for the mode that submitted it', () => {
    expect(
      resolveAccessError({
        authStatus: 'error',
        currentMode: 'sign-in',
        error: '登录失败',
        submittedMode: 'sign-in',
      }),
    ).toBe('登录失败');

    expect(
      resolveAccessError({
        authStatus: 'error',
        currentMode: 'register',
        error: '登录失败',
        submittedMode: 'sign-in',
      }),
    ).toBeNull();
  });

  it('hides stale errors after the form clears its submission owner', () => {
    expect(
      resolveAccessError({
        authStatus: 'error',
        currentMode: 'sign-in',
        error: '登录失败',
        submittedMode: null,
      }),
    ).toBeNull();
  });

  it('turns browser network failures into an actionable Chinese message', () => {
    expect(
      resolveAccessError({
        authStatus: 'error',
        currentMode: 'sign-in',
        error: 'Failed to fetch',
        submittedMode: 'sign-in',
      }),
    ).toBe('暂时无法连接登录服务，请检查网络后重试。');
  });

  it('keeps a specific service error instead of misclassifying it as a network failure', () => {
    expect(
      resolveAccessError({
        authStatus: 'error',
        currentMode: 'sign-in',
        error: 'Account preload failed',
        submittedMode: 'sign-in',
      }),
    ).toBe('Account preload failed');
  });
});
