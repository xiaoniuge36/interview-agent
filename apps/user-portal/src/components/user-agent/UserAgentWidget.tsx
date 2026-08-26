'use client';

import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import type { AgentStatus } from '@page-agent/core';
import {
  shouldPollPageAgentRun,
  usePageAgentActiveRunProbe,
} from '@interview-agent/page-agent-client';
import { apiRequest } from '@/lib/api';
import { listUserAgentConversations } from '@/lib/user-agent-conversation-api';
import { createUserAgentLatestRunRequest } from '@/lib/user-page-agent-run-api';
import { MobileBottomNav } from '../shell/MobileBottomNav';
import { UserAgentFloatButton, UserAgentMobileTrigger } from './UserAgentFloatButton';
import { useUserAgentDrag } from './useUserAgentDrag';

const UserAgentWidgetBody = dynamic(
  () => import('./UserAgentWidgetBody').then((module) => module.UserAgentWidgetBody),
  { ssr: false },
);

/**
 * 浮窗宿主：常驻的仅有轻量触发按钮与移动端导航；
 * 完整浮窗（config/会话 bootstrap）延迟到首次打开时才动态挂载。
 * 未挂载期间用空闲探测保留“存在进行中 run”的恢复提示语义。
 */
export function UserAgentWidget() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [bodyStatus, setBodyStatus] = useState<AgentStatus>('idle');
  const openAgent = useCallback(() => {
    setMounted(true);
    setOpen(true);
  }, []);
  const requestClose = useCallback(() => setOpen(false), []);
  const drag = useUserAgentDrag(openAgent);
  const hasActiveRun = usePageAgentActiveRunProbe(!mounted, probeActiveUserAgentRun);
  const probedStatus: AgentStatus = hasActiveRun ? 'running' : 'idle';
  const status = mounted ? bodyStatus : probedStatus;
  return (
    <>
      <MobileBottomNav
        agentTrigger={<UserAgentMobileTrigger open={open} onClick={openAgent} status={status} />}
      />
      <UserAgentFloatButton {...drag} open={open} status={status} />
      {mounted ? (
        <UserAgentWidgetBody
          open={open}
          onRequestClose={requestClose}
          onStatusChange={setBodyStatus}
        />
      ) : null}
    </>
  );
}

async function probeActiveUserAgentRun(): Promise<boolean> {
  const conversations = await listUserAgentConversations();
  const latestConversation = conversations[0];
  if (!latestConversation) return false;
  const latestRun = await apiRequest(createUserAgentLatestRunRequest(latestConversation.id));
  return shouldPollPageAgentRun(latestRun, null);
}
