'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@interview-agent/auth-client';
import { FederatedAccessScreen } from '@/components/auth/FederatedAccessScreen';
import { LocalAccessScreen } from '@/components/auth/LocalAccessScreen';

/** 根路径：已登录进 /home，未登录展示登录 */
export default function RootPage() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.status === 'authenticated') {
      router.replace('/home');
    }
  }, [auth.status, router]);

  if (auth.status === 'authenticated') {
    return <main className="auth-bootstrap" aria-busy="true" aria-label="进入工作台" />;
  }
  if (auth.status === 'loading') {
    return <main className="auth-bootstrap" aria-busy="true" aria-label="加载中" />;
  }
  return auth.mode === 'local' ? <LocalAccessScreen /> : <FederatedAccessScreen />;
}