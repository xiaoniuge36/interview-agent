import type { AgentStatus, PageAgentCore } from '@page-agent/core';
import { useEffect, useRef, useState } from 'react';
import type { UserPageAgentConfig } from '@/lib/user-page-agent-api';
import {
  appendPageAgentExecutionStep,
  createUserAgentRuntime,
  type PageAgentExecutionStep,
} from './user-agent-runtime';
import { runRuntimeCreation } from './runtime-creation';

type UserAgentRuntimeOptions = {
  config: UserPageAgentConfig | null;
  conversationId: string | null;
  conversationContext: string;
  pageContext: string;
  onAskUser: (question: string, options?: { signal: AbortSignal }) => Promise<string>;
};

export function useUserAgentRuntime(options: UserAgentRuntimeOptions) {
  const { config, conversationId, conversationContext, pageContext, onAskUser } = options;
  const [agent, setAgent] = useState<PageAgentCore | null>(null);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [activity, setActivity] = useState('准备开始');
  const [executionSteps, setExecutionSteps] = useState<PageAgentExecutionStep[]>([]);
  const { tokens, setTokens, error, setError } = useRuntimeTelemetry();
  const contextRef = useLatestRef(conversationContext);
  useEffect(() => {
    if (!config?.enabled || !config.model || !conversationId) return;
    let disposed = false;
    setError(null);
    void runRuntimeCreation({
      create: () =>
        createUserAgentRuntime({
          config,
          getConversationContext: () => contextRef.current,
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
        }),
      fallbackMessage: '无法启动 AI 刷题教练。',
      isDisposed: () => disposed,
      onDispose: (next) => next.dispose(),
      onError: setError,
      onReady: setAgent,
    });
    return () => {
      disposed = true;
      setAgent((current) => {
        current?.dispose();
        return null;
      });
      setStatus('idle');
      setActivity('准备开始');
      setExecutionSteps([]);
      setTokens(0);
      setError(null);
    };
  }, [config, contextRef, conversationId, onAskUser, pageContext, setError, setTokens]);
  return { agent, status, activity, executionSteps, tokens, error };
}

function useRuntimeTelemetry() {
  const [tokens, setTokens] = useState(0);
  const [error, setError] = useState<string | null>(null);
  return { tokens, setTokens, error, setError };
}

function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
