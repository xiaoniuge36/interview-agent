'use client';

import Link from 'next/link';
import { useEffect } from 'react';

type RouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AuthenticatedRouteError({ error, reset }: RouteErrorProps) {
  useEffect(() => {
    console.error('[route-error]', error);
  }, [error]);

  return (
    <section className="workspace route-error" role="alert" data-testid="route-error">
      <div className="route-error-panel">
        <span className="route-error-eyebrow">RUNTIME · 页面异常</span>
        <h1>这一页刚才没有加载成功</h1>
        <p>可能是网络波动或临时故障。重试通常可以恢复；若持续出现，请返回首页后再进入。</p>
        {error.digest ? <code className="route-error-digest">错误编号：{error.digest}</code> : null}
        <div className="route-error-actions">
          <button className="button primary" type="button" onClick={reset}>
            重试
          </button>
          <Link className="button secondary" href="/home">
            返回首页
          </Link>
        </div>
      </div>
    </section>
  );
}
