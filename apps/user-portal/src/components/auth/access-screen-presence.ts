'use client';

import { useEffect, useState } from 'react';
import type { AuthStatus } from '@interview-agent/auth-client';

export function accessScreenPresence(current: boolean, status: AuthStatus): boolean {
  if (status === 'authenticated') return false;
  if (status === 'loading') return current;
  return true;
}

export function useAccessScreenPresence(status: AuthStatus): boolean {
  const [visible, setVisible] = useState(() => accessScreenPresence(false, status));
  useEffect(() => {
    setVisible((current) => accessScreenPresence(current, status));
  }, [status]);
  return visible;
}
