'use client';

import { useAuth } from '@interview-agent/auth-client';
import { UserShell } from '@/components/UserShell';
import { HomePageContent } from '@/components/home/HomePageContent';
import { FederatedAccessScreen } from './FederatedAccessScreen';
import { LocalAccessScreen } from './LocalAccessScreen';

export function PortalAccess() {
  const auth = useAuth();
  if (auth.status === 'authenticated') return <AuthenticatedPortal />;
  if (auth.status === 'loading') return <AccessLoading />;
  return auth.mode === 'local' ? <LocalAccessScreen /> : <FederatedAccessScreen />;
}

function AuthenticatedPortal() {
  return (
    <UserShell>
      <HomePageContent />
    </UserShell>
  );
}

function AccessLoading() {
  return (
    <main className="access-shell access-shell-simple" aria-live="polite">
      <section className="access-panel federated-access">
        <span className="brand-mark">IA</span>
        <p className="eyebrow">正在准备工作台</p>
        <h1>正在检查登录状态</h1>
        <p>确认身份后，将为你恢复上一次的训练进度。</p>
      </section>
    </main>
  );
}
