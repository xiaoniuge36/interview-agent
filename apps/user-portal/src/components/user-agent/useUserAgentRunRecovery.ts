import { useCallback, useEffect, useRef, useState } from 'react';
import {
  completeUserAgentRun,
  createUserAgentRun,
  getUserAgentRunHistory,
  heartbeatUserAgentRun,
  type UserAgentCompleteRunInput,
  type UserAgentHeartbeatRunInput,
  type UserAgentRun,
} from '@/lib/user-page-agent-run-api';
import {
  loadCurrentUserAgentRunHistory,
  mergeUserAgentRunProgress,
  shouldRefreshUserAgentRun,
} from './user-agent-run-recovery-model';
import { loadConversationRuns } from './user-agent-run-history';

const HEARTBEAT_INTERVAL_MS = 15_000;
const REMOTE_RUN_POLL_INTERVAL_MS = 15_000;
const RUN_HISTORY_LIMIT = 8;
const MAX_STEP_LENGTH = 500;

export type UserAgentRunLifecycle = {
  startRun: (prompt: string, retryOfRunId?: string) => Promise<UserAgentRun>;
  completeRun: (runId: string, input: UserAgentCompleteRunInput) => Promise<void>;
  cancelActiveRun: () => Promise<void>;
  reportProgress: (update: Partial<UserAgentHeartbeatRunInput>) => void;
  markWaiting: (question: string) => Promise<void>;
  markRunning: () => Promise<void>;
};

export function useUserAgentRunRecovery(conversationId: string | null) {
  const state = useRecoveryState(conversationId);
  const transport = useRunTransport(state);
  useRunTimers(state, transport.sendHeartbeat, transport.refreshHistory);
  const lifecycle = useRunLifecycle(state, transport.sendHeartbeat);
  return {
    latestRun: state.latestRun,
    runHistory: state.runHistory,
    error: state.error,
    activeRunId: state.activeRunId,
    ...lifecycle,
  } satisfies UserAgentRunLifecycle & {
    latestRun: UserAgentRun | null;
    runHistory: UserAgentRun[];
    error: string | null;
    activeRunId: string | null;
  };
}

type RecoveryState = ReturnType<typeof useRecoveryState>;

function useRecoveryState(conversationId: string | null) {
  const [latestRun, setLatestRun] = useState<UserAgentRun | null>(null);
  const [runHistory, setRunHistory] = useState<UserAgentRun[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeRunIdRef = useRef<string | null>(null);
  const progressRef = useRef<UserAgentHeartbeatRunInput>({ status: 'running' });
  const conversationIdRef = useRef(conversationId);
  const runConversationsRef = useRef(new Map<string, string>());
  conversationIdRef.current = conversationId;
  useEffect(() => {
    activeRunIdRef.current = null;
    progressRef.current = { status: 'running' };
    setActiveRunId(null);
    setLatestRun(null);
    setRunHistory([]);
    setError(null);
    return loadConversationRuns({ conversationId, setLatestRun, setRunHistory, setError });
  }, [conversationId]);
  return {
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
  };
}

function useRunTransport(state: RecoveryState) {
  const stateRef = useLatestValue(state);
  const sendHeartbeat = useCallback(
    async (runId: string) => {
      const recovery = stateRef.current;
      try {
        const updated = await heartbeatUserAgentRun(runId, recovery.progressRef.current);
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
      const runs = await loadCurrentUserAgentRunHistory(
        conversationId,
        getUserAgentRunHistory,
        (sourceConversationId) => recovery.conversationIdRef.current === sourceConversationId,
      );
      if (!runs) return;
      recovery.setRunHistory(runs);
      recovery.setLatestRun(runs[0] ?? null);
      recovery.setError(null);
    } catch (reason) {
      recovery.setError(errorMessage(reason, '无法读取上次训练运行状态。'));
    }
  }, [stateRef]);
  return { sendHeartbeat, refreshHistory };
}

function useRunTimers(
  state: RecoveryState,
  sendHeartbeat: (runId: string) => Promise<void>,
  refreshHistory: () => Promise<void>,
) {
  useEffect(() => {
    if (!state.activeRunId) return;
    const timer = window.setInterval(
      () => void sendHeartbeat(state.activeRunId!),
      HEARTBEAT_INTERVAL_MS,
    );
    return () => window.clearInterval(timer);
  }, [sendHeartbeat, state.activeRunId]);
  useEffect(() => {
    if (!shouldRefreshUserAgentRun(state.latestRun, state.activeRunId, state.error)) return;
    const timer = window.setInterval(() => void refreshHistory(), REMOTE_RUN_POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [refreshHistory, state.activeRunId, state.error, state.latestRun]);
}

function useRunLifecycle(state: RecoveryState, sendHeartbeat: (runId: string) => Promise<void>) {
  const stateRef = useLatestValue(state);
  const startRun = useCallback(
    (prompt: string, retryOfRunId?: string) =>
      startUserAgentRun(stateRef.current, prompt, retryOfRunId),
    [stateRef],
  );
  const completeRun = useCallback(
    (runId: string, input: UserAgentCompleteRunInput) =>
      completeUserAgentRunRecord(stateRef.current, runId, input),
    [stateRef],
  );
  const cancelActiveRun = useCallback(async () => {
    const runId = stateRef.current.activeRunIdRef.current;
    if (runId) await completeUserAgentRunRecord(stateRef.current, runId, { status: 'cancelled' });
  }, [stateRef]);
  const reportProgress = useCallback(
    (update: Partial<UserAgentHeartbeatRunInput>) => {
      const recovery = stateRef.current;
      recovery.progressRef.current = mergeUserAgentRunProgress(recovery.progressRef.current, {
        ...update,
        ...(update.currentStep
          ? { currentStep: update.currentStep.slice(0, MAX_STEP_LENGTH) }
          : {}),
      });
    },
    [stateRef],
  );
  const setRunPhase = useCallback(
    async (status: UserAgentHeartbeatRunInput['status'], currentStep: string) => {
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

async function startUserAgentRun(state: RecoveryState, prompt: string, retryOfRunId?: string) {
  const conversationId = state.conversationIdRef.current;
  if (!conversationId) throw new Error('请先创建或选择一个对话。');
  try {
    const run = await createUserAgentRun(conversationId, {
      prompt,
      clientRequestId: crypto.randomUUID(),
      ...(retryOfRunId ? { retryOfRunId } : {}),
    });
    if (state.conversationIdRef.current !== conversationId) {
      await cancelUnstartedRun(run.id);
      throw new Error('对话已切换，本次任务未执行。');
    }
    state.runConversationsRef.current.set(run.id, conversationId);
    state.progressRef.current = { status: 'running', currentStep: '任务已开始', tokenCount: 0 };
    state.activeRunIdRef.current = run.id;
    state.setActiveRunId(run.id);
    updateRunState(state, run);
    state.setError(null);
    return run;
  } catch (reason) {
    const message = errorMessage(reason, '无法创建运行记录，任务未执行。');
    if (state.conversationIdRef.current === conversationId) state.setError(message);
    throw new Error(message, { cause: reason });
  }
}

async function completeUserAgentRunRecord(
  state: RecoveryState,
  runId: string,
  input: UserAgentCompleteRunInput,
) {
  const conversationId = state.runConversationsRef.current.get(runId);
  deactivateRun(state, runId);
  try {
    const updated = await completeUserAgentRun(
      runId,
      withProgress(input, state.progressRef.current),
    );
    if (state.conversationIdRef.current === updated.conversationId) updateRunState(state, updated);
    state.setError(null);
  } catch (reason) {
    if (state.conversationIdRef.current === conversationId)
      state.setError(errorMessage(reason, '运行结果保存失败，系统会将其识别为中断任务。'));
  } finally {
    state.runConversationsRef.current.delete(runId);
  }
}

function deactivateRun(state: RecoveryState, runId: string) {
  if (state.activeRunIdRef.current !== runId) return;
  state.activeRunIdRef.current = null;
  state.setActiveRunId(null);
}

function updateRunState(state: RecoveryState, run: UserAgentRun) {
  state.setLatestRun(run);
  state.setRunHistory((current) =>
    [run, ...current.filter((item) => item.id !== run.id)].slice(0, RUN_HISTORY_LIMIT),
  );
}

async function cancelUnstartedRun(runId: string) {
  try {
    await completeUserAgentRun(runId, {
      status: 'cancelled',
      errorCode: 'CONVERSATION_CHANGED',
      errorSummary: '对话已切换，本次任务未执行。',
    });
  } catch {
    // 服务恢复后会按心跳超时将该记录归类为 interrupted。
  }
}

function withProgress(input: UserAgentCompleteRunInput, progress: UserAgentHeartbeatRunInput) {
  return {
    ...(progress.currentStep ? { currentStep: progress.currentStep } : {}),
    ...(progress.tokenCount === undefined ? {} : { tokenCount: progress.tokenCount }),
    ...input,
  };
}

function useLatestValue<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

function errorMessage(reason: unknown, fallback: string) {
  return reason instanceof Error ? reason.message : fallback;
}
