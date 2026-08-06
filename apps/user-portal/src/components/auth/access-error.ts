import type { AuthStatus } from '@interview-agent/auth-client';
import type { AccessMode } from './access-types';

const NETWORK_ACCESS_ERROR =
  /^(?:typeerror:\s*)?(?:failed to fetch|fetch failed|load failed|networkerror(?: when attempting to fetch resource\.?)?)$/i;

export function resolveAccessError({
  authStatus,
  currentMode,
  error,
  submittedMode,
}: {
  authStatus: AuthStatus;
  currentMode: AccessMode;
  error: string | null;
  submittedMode: AccessMode | null;
}): string | null {
  if (authStatus !== 'error' || currentMode !== submittedMode) return null;
  if (error && NETWORK_ACCESS_ERROR.test(error)) {
    return '暂时无法连接登录服务，请检查网络后重试。';
  }
  return error;
}
