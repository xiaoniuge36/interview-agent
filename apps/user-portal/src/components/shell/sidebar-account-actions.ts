import type { AuthMode } from '@interview-agent/auth-client';

export type SidebarAccountAction = 'settings' | 'sign_out';

export function sidebarAccountActions(mode: AuthMode): SidebarAccountAction[] {
  return mode === 'development' ? ['settings'] : ['settings', 'sign_out'];
}
