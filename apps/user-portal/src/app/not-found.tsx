import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '页面不存在 · Interview Agent',
};

export default function NotFound() {
  return (
    <section className="workspace route-error route-missing" data-testid="route-not-found">
      <div className="route-error-panel">
        <span className="route-error-eyebrow">404 · 页面不存在</span>
        <h1>这个地址没有对应的页面</h1>
        <p>链接可能已失效，或地址拼写有误。回到首页继续今天的训练，或直接进入题库开始一轮练习。</p>
        <div className="route-error-actions">
          <Link className="button primary" href="/home">
            回到首页
          </Link>
          <Link className="button secondary" href="/practice">
            去刷题
          </Link>
        </div>
      </div>
    </section>
  );
}
