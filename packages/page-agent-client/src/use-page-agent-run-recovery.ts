import { useCallback, useEffect, useRef, useState } from 'react';
import type { PageAgentRun } from '@interview-agent/contracts';
import type { PageAgentCompleteRunInput, PageAgentHeartbeatRunInput } from './requests';
import {
  completePageAgentRunRecord,
  errorMessage,
  loadConversationRuns,
  startPageAgentRun,
  updateRunState,
  type PageAgentRunRecoveryOptions,
} from './run-recovery-actions';
import {
  loadCurrentPageAgentRunHistory,
  mergePageAgentRunProgress,
  shouldRefreshPageAgentRun,
} from './run-recovery-model';

const HEARTBEAT_INTERVAL_MS = 15_000;
const REMOTE_RUN_POLL_INTERVAL_MS = 15_000;
const MAX_STEP_LENGTH = 500;

export type PageAgentRunLifecycle = {
  startRun: (prompt: string, retryOfRunId?: string) => Promise<PageAgentRun>;
  completeRun: (runId: string, input: PageAgentCompleteRunInput) => Promise<void>;
  cancelActiveRun: () => Promise<void>;
  reportProgress: (update: Partial<PageAgentHeartbeatRunInput>) => void;
  markWaiting: (question: string) => Promise<void>;
  markRunning: () => Promise<void>;
};

export function usePageAgentRunRecovery(
  conversationId: string | null,
  options: PageAgentRunRecoveryOptions,
) {
  const state = useRecoveryState(conversationId, options);
  const transport = useRunTransport(state);
  useRunTimers(state, transport.sendHeartbeat, transport.refreshHistory);
  const lifecycle = useRunLifecycle(state, transport.sendHeartbeat);
  return {
    latestRun: state.latestRun,
    runHistory: state.runHistory,
    error: state.error,
    activeRunId: state.activeRunId,
    ...lifecycle,
  } satisfies PageAgentRunLifecycle & {
    latestRun: PageAgentRun | null;
    runHistory: PageAgentRun[];
    error: string | null;
    activeRunId: string | null;
  };
}

type RecoveryState = ReturnType<typeof useRecoveryState>;

function useRecoveryState(conversationId: string | null, options: PageAgentRunRecoveryOptions) {
  const [latestRun, setLatestRun] = useState<PageAgentRun | null>(null);
  const [runHistory, setRunHistory] = useState<PageAgentRun[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeRunIdRef = useRef<string | null>(null);
  const progressRef = useRef<PageAgentHeartbeatRunInput>({ status: 'running' });
  const conversationIdRef = useRef(conversationId);
  const runConversationsRef = useRef(new Map<string, string>());
  const optionsRef = useRef(options);
  conversationIdRef.current = conversationId;
  optionsRef.current = options;
  const store = {
    latestRun,
    runHistory,
    activeRunId,
    error,
    setLatestRun,
    setRunHistory,
    setActiveRunId,
    setError,
    activeRunIdRef,
    progressRef,
    conversationIdRef,
    runConversationsRef,
    optionsRef,
  };
  const storeRef = useLatestValue(store);
  useEffect(() => {
    activeRunIdRef.current = null;
    progressRef.current = { status: 'running' };
    setActiveRunId(null);
    setLatestRun(null);
    setRunHistory([]);
    setError(null);
    return loadConversationRuns(conversationId, storeRef.current);
  }, [conversationId, storeRef]);
  return store;
}

function useRunTransport(state: RecoveryState) {
  const stateRef = useLatestValue(state);
  const sendHeartbeat = useCallback(
    async (runId: string) => {
      const recovery = stateRef.current;
      try {
        const updated = await recovery.optionsRef.current.api.heartbeatRun(
          runId,
          recovery.progressRef.current,
        );
        if (recovery.activeRunIdRef.current !== runId) return;
        updateRunState(recovery, updated);
        recovery.setError(null);
      } catch (reason) {
        if (recovery.activeRunIdRef.current === runId)
          recovery.setError(errorMessage(reason, '运行状态同步失败，系统会保留中断记录。'));
      }
    },
    [stateRef],
  );
  const refreshHistory = useCallback(async () => {
    const recovery = stateRef.current;
    const conversationId = recovery.conversationIdRef.current;
    if (!conversationId) return;
    try {
      const runs = await loadCurrentPageAgentRunHistory(
        conversationId,
        recovery.optionsRef.current.api.getRunHistory,
        (sourceConversationId) => recovery.conversationIdRef.current === sourceConversationId,
      );
      if (!runs) return;
      recovery.setRunHistory(runs);
      recovery.setLatestRun(runs[0] ?? null);
      recovery.setError(null);
    } catch (reason) {
      recovery.setError(
        errorMessage(reason, recovery.optionsRef.current.messages.historyUnavailable),
      );
    }
  }, [stateRef]);
  return { sendHeartbeat, refreshHistory };
}

function useRunTimers(
  state: RecoveryState,
  sendHeartbeat: (runId: string) => Promise<void>,
  refreshHistory: () => Promise<void>,
) {
  const { activeRunId, latestRun, error } = state;
  useEffect(() => {
    if (!activeRunId) return;
    const timer = window.setInterval(() => void sendHeartbeat(activeRunId), HEARTBEAT_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [sendHeartbeat, activeRunId]);
  useEffect(() => {
    if (!shouldRefreshPageAgentRun(latestRun, activeRunId, error)) return;
    const timer = window.setInterval(() => void refreshHistory(), REMOTE_RUN_POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [refreshHistory, activeRunId, error, latestRun]);
}

function useRunLifecycle(state: RecoveryState, sendHeartbeat: (runId: string) => Promise<void>) {
  const stateRef = useLatestValue(state);
  const startRun = useCallback(
    (prompt: string, retryOfRunId?: string) =>
      startPageAgentRun(stateRef.current, prompt, retryOfRunId),
    [stateRef],
  );
  const completeRun = useCallback(
    (runId: string, input: PageAgentCompleteRunInput) =>
      completePageAgentRunRecord(stateRef.current, runId, input),
    [stateRef],
  );
  const cancelActiveRun = useCallback(async () => {
    const runId = stateRef.current.activeRunIdRef.current;
    if (runId) await completePageAgentRunRecord(stateRef.current, runId, { status: 'cancelled' });
  }, [stateRef]);
  const reportProgress = useCallback(
    (update: Partial<PageAgentHeartbeatRunInput>) => {
      const recovery = stateRef.current;
      recovery.progressRef.current = mergePageAgentRunProgress(recovery.progressRef.current, {
        ...update,
        ...(update.currentStep
          ? { currentStep: update.currentStep.slice(0, MAX_STEP_LENGTH) }
          : {}),
      });
    },
    [stateRef],
  );
  const setRunPhase = useCallback(
    async (status: PageAgentHeartbeatRunInput['status'], currentStep: string) => {
      const runId = stateRef.current.activeRunIdRef.current;
      if (!runId) return;
      reportProgress({ status, currentStep });
      await sendHeartbeat(runId);
    },
    [reportProgress, sendHeartbeat, stateRef],
  );
  const markWaiting = useCallback(
    (question: string) => setRunPhase('waiting_confirmation', `等待确认：${question}`),
    [setRunPhase],
  );
  const markRunning = useCallback(
    () => setRunPhase('running', '已收到确认，继续执行'),
    [setRunPhase],
  );
  return { startRun, completeRun, cancelActiveRun, reportProgress, markWaiting, markRunning };
}

function useLatestValue<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
