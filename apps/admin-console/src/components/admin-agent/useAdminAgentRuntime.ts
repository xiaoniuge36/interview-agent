import type { AgentStatus, PageAgentCore } from '@page-agent/core';
import { useEffect, useRef, useState } from 'react';
import type { AdminPageAgentConfig } from '@/lib/admin-page-agent-api';
import { createAdminAgentRuntime } from './admin-agent-runtime';

export function useAdminAgentRuntime(options: {
  enabled: boolean;
  config: AdminPageAgentConfig | null;
  role: string | undefined;
  conversationId: string | null;
  conversationContext: string;
  conversationLoaded: boolean;
  onAskUser: (question: string, options?: { signal: AbortSignal }) => Promise<string>;
}) {
  const {
    enabled,
    config,
    conversationId,
    conversationContext,
    conversationLoaded,
    role,
    onAskUser,
  } = options;
  const [agent, setAgent] = useState<PageAgentCore | null>(null);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [activity, setActivity] = useState('准备就绪');
  const [tokens, setTokens] = useState(0);
  const conversationContextRef = useRef(conversationContext);
  conversationContextRef.current = conversationContext;

  useEffect(() => {
    if (!enabled || !config?.enabled || !config.model || !conversationId) return;
    let disposed = false;
    void createAdminAgentRuntime({
      config,
      role,
      conversationContext: conversationContextRef.current,
      onActivity: setActivity,
      onStatus: setStatus,
      onTokens: setTokens,
      onAskUser,
    }).then((next) => {
      if (disposed) next.dispose();
      else setAgent(next);
    });
    return () => {
      disposed = true;
      setAgent((current) => {
        current?.dispose();
        return null;
      });
      resetRuntime(setStatus, setActivity, setTokens);
    };
  }, [config, conversationId, conversationLoaded, enabled, onAskUser, role]);

  return { agent, status, activity, tokens };
}

function resetRuntime(
  setStatus: (status: AgentStatus) => void,
  setActivity: (activity: string) => void,
  setTokens: (tokens: number) => void,
) {
  setStatus('idle');
  setActivity('准备就绪');
  setTokens(0);
}
