'use client';

import { useState } from 'react';
import { useAuth } from '@interview-agent/auth-client';
import { AccessStory } from './AccessStory';
import { createExclusiveAccessActionRunner } from './access-action-single-flight';

export function FederatedAccessScreen() {
  const auth = useAuth();
  const [runAccessAction] = useState(createExclusiveAccessActionRunner);
  const signIn = () => void runAccessAction(() => auth.signIn());
  return (
    <main className="access-shell">
      <AccessStory />
      <section
        className="access-panel federated-access"
        id="access-panel"
        aria-labelledby="federated-access-title"
        tabIndex={-1}
      >
        <span className="brand-mark" aria-hidden="true">
          <span className="brand-mark-core" />
        </span>
        <p className="eyebrow">安全登录</p>
        <h1 id="federated-access-title">进入你的训练空间</h1>
        <p>登录后接续画像、岗位、面试记录与可记忆的训练进度。</p>
        {auth.status === 'error' && auth.error ? <AccessError message={auth.error} /> : null}
        <button
          className="button access-submit"
          disabled={auth.status === 'loading'}
          type="button"
          onClick={signIn}
        >
          继续登录
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
