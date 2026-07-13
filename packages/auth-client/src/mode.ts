import { AuthConfigurationError } from './errors';
import type { AuthMode } from './types';

export function parseAuthMode(
  value: string | undefined,
  fallback: AuthMode = 'development',
): AuthMode {
  const mode = value?.trim() || fallback;
  if (mode === 'development' || mode === 'oidc' || mode === 'local') return mode;
  throw new AuthConfigurationError('NEXT_PUBLIC_AUTH_MODE 仅允许 development、local 或 oidc。');
}
