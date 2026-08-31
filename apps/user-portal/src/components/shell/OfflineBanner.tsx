'use client';

import { useSyncExternalStore } from 'react';
import '@/app/styles/offline-banner.css';

function subscribeConnectivity(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

/** 单请求的网络错误文案不足以解释"全站都点不动"：断网时给全局提示。SSR 一律按在线渲染。 */
export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribeConnectivity,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <div className="offline-banner" role="alert">
      <span aria-hidden="true">!</span>
      网络连接已断开，改动暂时无法保存，请恢复网络后重试。
    </div>
  );
}
