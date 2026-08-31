'use client';

import { useAuth } from '@interview-agent/auth-client';
import { useEffect } from 'react';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { subscribeSessionExpiry } from '@/lib/api';

/** 并发请求会同时抛 401：闸门保证只提示并登出一次，登出失败后允许下一次事件重试。 */
export function createSessionExpiryListener(deps: {
  notifyExpired: (error: unknown) => void;
  signOut: () => Promise<unknown>;
}): (error: unknown) => void {
  let signingOut = false;
  return (error) => {
    if (signingOut) return;
    signingOut = true;
    deps.notifyExpired(error);
    void deps.signOut().finally(() => {
      signingOut = false;
    });
  };
}

/**
 * 会话失效全局闭环：任一请求遇到 401 即提示并退回登录，
 * 避免"壳层看着还登录、请求全挂"的假登录状态（与治理后台 AdminGlobalFeedback 同模式）。
 */
export function SessionExpiryWatcher() {
  const { signOut } = useAuth();
  const notifications = useNotifications();

  useEffect(() => {
    return subscribeSessionExpiry(
      createSessionExpiryListener({
        notifyExpired: (error) =>
          notifications.error('登录状态已失效', error, '正在返回登录页，请重新登录后继续。'),
        signOut,
      }),
    );
  }, [notifications, signOut]);

  return null;
}
