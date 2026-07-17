'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@interview-agent/auth-client';
import { AuthTransitionScreen } from './AuthTransitionScreen';
import { FederatedAccessScreen } from './FederatedAccessScreen';
import { LocalAccessScreen } from './LocalAccessScreen';

type RequireAuthProps = { children: ReactNode };

/** 已登录渲染子树；未登录展示登录；loading 透明占位避免闪屏 */
export function RequireAuth({ children }: RequireAuthProps) {
  const auth = useAuth();
  if (auth.status === 'authenticated') return <>{children}</>;
  if (auth.status === 'loading') {
    return <AuthTransitionScreen stage="checking" />;
  }
  return auth.mode === 'local' ? <LocalAccessScreen /> : <FederatedAccessScreen />;
}
