'use client';

import { useAuth } from '@interview-agent/auth-client';
import { App } from 'antd';
import { useEffect, useRef } from 'react';
import { isAdminSessionExpired, subscribeAdminApiErrors } from '@/lib/api';

const SESSION_EXPIRED_MESSAGE = '登录状态已失效，正在返回登录页。';

export function AdminGlobalFeedback() {
  const { signOut } = useAuth();
  const { message } = App.useApp();
  const isSigningOut = useRef(false);

  useEffect(() => {
    return subscribeAdminApiErrors((error) => {
      if (!isAdminSessionExpired(error)) {
        message.error(error.message);
        return;
      }
      if (isSigningOut.current) return;
      isSigningOut.current = true;
      message.error(SESSION_EXPIRED_MESSAGE);
      void signOut().finally(() => {
        isSigningOut.current = false;
      });
    });
  }, [message, signOut]);

  return null;
}
