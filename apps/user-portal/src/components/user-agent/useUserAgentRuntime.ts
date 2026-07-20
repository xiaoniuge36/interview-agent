import type { AgentStatus, PageAgentCore } from '@page-agent/core';
import { useEffect, useRef, useState } from 'react';
import type { UserPageAgentConfig } from '@/lib/user-page-agent-api';
import { createUserAgentRuntime } from './user-agent-runtime';

export function useUserAgentRuntime(options: {
  config: UserPageAgentConfig | null;
  conversationId: string | null;
  conversationContext: string;
  onAskUser: (question: string, options?: { signal: AbortSignal }) => Promise<string>;
}) {
  const { config, conversationId, conversationContext, onAskUser } = options;
  const [agent, setAgent] = useState<PageAgentCore | null>(null);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [activity, setActivity] = useState('准备开始');
  const [tokens, setTokens] = useState(0);
  const contextRef = useRef(conversationContext);
  contextRef.current = conversationContext;
  useEffect(() => {
    if (!config?.enabled || !config.model || !conversationId) return;
    let disposed = false;
    void createUserAgentRuntime({
      config,
      conversationContext: contextRef.current,
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
      setStatus('idle');
      setActivity('准备开始');
      setTokens(0);
    };
  }, [config, conversationId, onAskUser]);
  return { agent, status, activity, tokens };
}
