import type { AgentStatus, PageAgentCore } from '@page-agent/core';
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { AdminAgentHeartbeatRunInput } from '@/lib/admin-page-agent-run-api';
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
  onRunProgress: (update: Partial<AdminAgentHeartbeatRunInput>) => void;
};

type RuntimeSetters = {
  setAgent: Dispatch<SetStateAction<PageAgentCore | null>>;
  setStatus: Dispatch<SetStateAction<AgentStatus>>;
  setActivity: Dispatch<SetStateAction<string>>;
  setExecutionSteps: Dispatch<SetStateAction<PageAgentExecutionStep[]>>;
  setTokens: Dispatch<SetStateAction<number>>;
};

export function useAdminAgentRuntime(options: UseAdminAgentRuntimeOptions) {
  const [agent, setAgent] = useState<PageAgentCore | null>(null);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [activity, setActivity] = useState('准备就绪');
  const [executionSteps, setExecutionSteps] = useState<PageAgentExecutionStep[]>([]);
  const [tokens, setTokens] = useState(0);
  const setters = useMemo(
    () => ({ setAgent, setStatus, setActivity, setExecutionSteps, setTokens }),
    [],
  );
  const conversationContextRef = useRef(options.conversationContext);
  conversationContextRef.current = options.conversationContext;
  useRuntimeLifecycle(options, setters, conversationContextRef);
  return { agent, status, activity, executionSteps, tokens };
}

function useRuntimeLifecycle(
  options: UseAdminAgentRuntimeOptions,
  setters: RuntimeSetters,
  conversationContextRef: { current: string },
) {
  const {
    config,
    conversationId,
    conversationLoaded,
    enabled,
    onAskUser,
    onRunProgress,
    pageContext,
    role,
  } = options;
  useEffect(
    () =>
      setupRuntime(
        {
          config,
          conversationId,
          enabled,
          onAskUser,
          onRunProgress,
          pageContext,
          role,
        },
        setters,
        conversationContextRef,
      ),
    [
      config,
      conversationId,
      conversationLoaded,
      enabled,
      onAskUser,
      onRunProgress,
      pageContext,
      role,
      setters,
      conversationContextRef,
    ],
  );
}

function setupRuntime(
  options: Omit<UseAdminAgentRuntimeOptions, 'conversationContext' | 'conversationLoaded'>,
  setters: RuntimeSetters,
  conversationContextRef: { current: string },
) {
  if (
    !options.enabled ||
    !options.config?.enabled ||
    !options.config.model ||
    !options.conversationId
  )
    return;
  let disposed = false;
  void createAdminAgentRuntime({
    config: options.config,
    role: options.role,
    conversationContext: conversationContextRef.current,
    pageContext: options.pageContext,
    ...runtimeCallbacks(options, setters),
  }).then((next) => {
    if (disposed) next.dispose();
    else setters.setAgent(next);
  });
  return () => {
    disposed = true;
    setters.setAgent((current) => {
      current?.dispose();
      return null;
    });
    resetRuntime(setters);
  };
}

function runtimeCallbacks(
  options: Pick<UseAdminAgentRuntimeOptions, 'onAskUser' | 'onRunProgress'>,
  setters: RuntimeSetters,
) {
  return {
    onActivity: (activity: string) => {
      setters.setActivity(activity);
      options.onRunProgress({ currentStep: activity });
    },
    onExecutionActivity: (activity: Parameters<typeof appendPageAgentExecutionStep>[1]) => {
      setters.setExecutionSteps((current) => appendPageAgentExecutionStep(current, activity));
      const step = appendPageAgentExecutionStep([], activity).at(-1);
      if (step) options.onRunProgress({ currentStep: step.label });
    },
    onStatus: (status: AgentStatus) => {
      setters.setStatus(status);
      if (status === 'running') setters.setExecutionSteps([]);
    },
    onTokens: (tokens: number) => {
      setters.setTokens(tokens);
      options.onRunProgress({ tokenCount: tokens });
    },
    onAskUser: options.onAskUser,
  };
}

function resetRuntime(setters: RuntimeSetters) {
  setters.setStatus('idle');
  setters.setActivity('准备就绪');
  setters.setExecutionSteps([]);
  setters.setTokens(0);
}
