'use client';

import { useAuth } from '@interview-agent/auth-client';
import { AccessStory } from './AccessStory';

export function FederatedAccessScreen() {
  const auth = useAuth();
  return (
    <main className="access-shell">
      <AccessStory />
      <section className="access-panel federated-access" aria-labelledby="federated-access-title">
        <span className="brand-mark">IA</span>
        <p className="eyebrow">统一身份登录</p>
        <h1 id="federated-access-title">进入个人训练工作台</h1>
        <p>登录后即可继续管理岗位资料、模拟记录、专项练习与个性化复盘建议。</p>
        {auth.status === 'error' && auth.error ? <AccessError message={auth.error} /> : null}
        <button className="button access-submit" type="button" onClick={() => void auth.signIn()}>
          使用组织账号继续
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
