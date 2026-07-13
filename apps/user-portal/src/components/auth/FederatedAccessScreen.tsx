'use client';

import { useAuth } from '@interview-agent/auth-client';

export function FederatedAccessScreen() {
  const auth = useAuth();
  return (
    <main className="access-shell access-shell-simple">
      <section className="access-panel federated-access" aria-labelledby="federated-access-title">
        <span className="brand-mark">IA</span>
        <p className="eyebrow">统一身份登录</p>
        <h1 id="federated-access-title">登录 Interview Agent</h1>
        <p>使用组织账号继续访问你的训练资料、面试记录和复盘报告。</p>
        {auth.status === 'error' && auth.error ? <AccessError message={auth.error} /> : null}
        <button className="button access-submit" type="button" onClick={() => void auth.signIn()}>
          前往组织登录
        </button>
      </section>
    </main>
  );
}

function AccessError({ message }: { message: string }) {
  return (
    <p className="access-error" role="alert">
      {message}
    </p>
  );
}
