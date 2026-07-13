'use client';

import type { ReactNode } from 'react';
import { useAuth } from './auth-context';

type AuthGateProps = {
  children: ReactNode;
  applicationName: string;
};

export function AuthGate({ children, applicationName }: AuthGateProps) {
  const auth = useAuth();
  if (auth.status === 'authenticated') return children;
  if (auth.status === 'loading') return <AuthStatusCard title="正在校验登录状态" />;
  if (auth.status === 'error') {
    return (
      <AuthStatusCard
        title="认证服务暂时不可用"
        message={auth.error ?? '请稍后重试。'}
        actionLabel="重新登录"
        onAction={() => void auth.signIn()}
      />
    );
  }
  return (
    <AuthStatusCard
      title={'登录 ' + applicationName}
      message="系统使用 Authorization Code + PKCE，不会把访问令牌写入 localStorage。"
      actionLabel="安全登录"
      onAction={() => void auth.signIn()}
    />
  );
}

type AuthStatusCardProps = {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

function AuthStatusCard(props: AuthStatusCardProps) {
  return (
    <main className="auth-state" aria-live="polite">
      <section className="auth-card">
        <div className="eyebrow">Secure Access</div>
        <h1>{props.title}</h1>
        {props.message ? <p>{props.message}</p> : null}
        {props.actionLabel && props.onAction ? (
          <button className="button" type="button" onClick={props.onAction}>
            {props.actionLabel}
          </button>
        ) : null}
      </section>
    </main>
  );
}
