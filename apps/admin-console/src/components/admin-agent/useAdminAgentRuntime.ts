import type { AgentStatus, PageAgentCore } from '@page-agent/core';
import { useEffect, useRef, useState } from 'react';
import type { AdminPageAgentConfig } from '@/lib/admin-page-agent-api';
import {
  appendPageAgentExecutionStep,
  createAdminAgentRuntime,
  type PageAgentExecutionStep,
} from './admin-agent-runtime';

type UseAdminAgentRuntimeOptions = {
  enabled: boolean;
  config: AdminPageAgentConfig | null;
  role: string | undefined;
  conversationId: string | null;
  conversationContext: string;
  pageContext: string;
  conversationLoaded: boolean;
  onAskUser: (question: string, options?: { signal: AbortSignal }) => Promise<string>;
};

export function useAdminAgentRuntime(options: UseAdminAgentRuntimeOptions) {
  const { enabled, config, conversationId, conversationContext, pageContext, conversationLoaded, role, onAskUser } = options;
  const [agent, setAgent] = useState<PageAgentCore | null>(null);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [activity, setActivity] = useState('准备就绪');
  const [executionSteps, setExecutionSteps] = useState<PageAgentExecutionStep[]>([]);
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
      pageContext,
      onActivity: setActivity,
      onExecutionActivity: (activity) =>
        setExecutionSteps((current) => appendPageAgentExecutionStep(current, activity)),
      onStatus: (nextStatus) => {
        setStatus(nextStatus);
        if (nextStatus === 'running') setExecutionSteps([]);
      },
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
      resetRuntime({ setStatus, setActivity, setExecutionSteps, setTokens });
    };
  }, [config, conversationId, conversationLoaded, enabled, onAskUser, pageContext, role]);

  return { agent, status, activity, executionSteps, tokens };
}

function resetRuntime({
  setStatus,
  setActivity,
  setExecutionSteps,
  setTokens,
}: {
  setStatus: (status: AgentStatus) => void,
  setActivity: (activity: string) => void,
  setExecutionSteps: (steps: PageAgentExecutionStep[]) => void,
  setTokens: (tokens: number) => void,
}) {
  setStatus('idle');
  setActivity('准备就绪');
  setExecutionSteps([]);
  setTokens(0);
}
