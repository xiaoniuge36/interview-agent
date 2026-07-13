import { AuthConfigurationError } from './errors';
import type { AuthMode } from './types';

export function parseAuthMode(value: string | undefined): AuthMode {
  const mode = value?.trim() || 'development';
  if (mode === 'development' || mode === 'oidc') return mode;
  throw new AuthConfigurationError('NEXT_PUBLIC_AUTH_MODE 仅允许 development 或 oidc。');
}
