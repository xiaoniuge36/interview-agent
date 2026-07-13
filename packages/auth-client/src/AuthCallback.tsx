'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './auth-context';

type AuthCallbackProps = {
  successPath?: string;
};

export function AuthCallback({ successPath = '/' }: AuthCallbackProps) {
  const { completeSignIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void completeSignIn()
      .then(() => window.location.replace(successPath))
      .catch((reason: unknown) => {
        if (active) setError(errorMessage(reason));
      });
    return () => {
      active = false;
    };
  }, [completeSignIn, successPath]);
  return (
    <main className="auth-state" aria-live="polite">
      <section className="auth-card">
        <div className="eyebrow">OIDC Callback</div>
        <h1>{error ? '登录回调失败' : '正在完成安全登录'}</h1>
        <p>{error ?? '正在校验授权码并恢复会话，请稍候。'}</p>
      </section>
    </main>
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '无法完成登录回调。';
}
