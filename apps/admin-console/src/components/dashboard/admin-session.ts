import type { AuthMode } from '@interview-agent/auth-client';

type AuthenticationRecovery = {
  action: 'reload' | 'sign-in' | 'sign-out';
  label: string;
};

export function getAuthenticationRecovery(mode: AuthMode): AuthenticationRecovery {
  if (mode === 'local') return { action: 'sign-out', label: '返回登录' };
  if (mode === 'oidc') return { action: 'sign-in', label: '重新登录' };
  return { action: 'reload', label: '重新加载' };
}
