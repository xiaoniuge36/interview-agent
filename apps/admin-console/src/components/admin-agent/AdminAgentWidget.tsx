'use client';

import { useAuth } from '@interview-agent/auth-client';
import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import type { AgentStatus } from '@page-agent/core';
import {
  shouldPollPageAgentRun,
  usePageAgentActiveRunProbe,
} from '@interview-agent/page-agent-client';
import type { AdminView } from '@/components/admin-navigation';
import { listAdminAgentConversations } from '@/lib/admin-page-agent-conversation-api';
import { getLatestAdminAgentRun } from '@/lib/admin-page-agent-run-api';
import { AdminAgentFloatButton } from './AdminAgentFloatButton';
import { useAdminAgentDrag } from './useAdminAgentDrag';

const AdminAgentWidgetBody = dynamic(
  () => import('./AdminAgentWidgetBody').then((module) => module.AdminAgentWidgetBody),
  { ssr: false },
);

/**
 * 浮窗宿主：常驻的仅有轻量触发按钮；完整浮窗（config/会话 bootstrap）
 * 延迟到首次打开时才动态挂载。未挂载期间用空闲探测保留进行中 run 的提示。
 */
export function AdminAgentWidget({ activeView }: { activeView: AdminView }) {
  const role = useAuth().identity?.role;
  const enabled = role === 'admin' || role === 'platform_admin';
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [bodyStatus, setBodyStatus] = useState<AgentStatus>('idle');
  const openAgent = useCallback(() => {
    setMounted(true);
    setOpen(true);
  }, []);
  const requestClose = useCallback(() => setOpen(false), []);
  const drag = useAdminAgentDrag(openAgent);
  const hasActiveRun = usePageAgentActiveRunProbe(enabled && !mounted, probeActiveAdminAgentRun);
  if (!enabled) return null;
  const probedStatus: AgentStatus = hasActiveRun ? 'running' : 'idle';
  const status = mounted ? bodyStatus : probedStatus;
  return (
    <>
      <AdminAgentFloatButton {...drag} status={status} />
      {mounted ? (
        <AdminAgentWidgetBody
          activeView={activeView}
          open={open}
          onRequestClose={requestClose}
          onStatusChange={setBodyStatus}
        />
      ) : null}
    </>
  );
}

async function probeActiveAdminAgentRun(): Promise<boolean> {
  const conversations = await listAdminAgentConversations();
  const latestConversation = conversations[0];
  if (!latestConversation) return false;
  const latestRun = await getLatestAdminAgentRun(latestConversation.id);
  return shouldPollPageAgentRun(latestRun, null);
}
