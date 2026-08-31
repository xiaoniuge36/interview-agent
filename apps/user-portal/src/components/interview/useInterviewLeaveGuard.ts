'use client';

import { useEffect } from 'react';
import type { InterviewSession } from '@interview-agent/contracts';

/** 等待作答或 AI 处理中关页/刷新会打断本轮节奏，仅这两种状态需要离开确认。 */
export function shouldGuardInterviewLeave(
  session: Pick<InterviewSession, 'status'> | null,
  busy: boolean,
): boolean {
  if (busy) return true;
  return session?.status === 'waiting_user';
}

export function useInterviewLeaveGuard(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Chromium 仍要求写 returnValue 才会弹出原生确认框。
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [active]);
}
