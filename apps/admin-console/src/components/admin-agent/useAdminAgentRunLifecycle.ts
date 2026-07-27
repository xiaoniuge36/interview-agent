import { useCallback, useRef } from 'react';
import {
  completeAdminAgentRun,
  createAdminAgentRun,
  type AdminAgentCompleteRunInput,
  type AdminAgentHeartbeatRunInput,
  type AdminAgentRun,
} from '@/lib/admin-page-agent-run-api';
import { mergeAdminAgentRunProgress } from './admin-agent-run-recovery-model';
import type { RecoveryState } from './useAdminAgentRunRecovery';

const MAX_STEP_LENGTH = 500;
const RUN_HISTORY_LIMIT = 8;

export type AdminAgentRunLifecycle = {
  startRun: (prompt: string, retryOfRunId?: string) => Promise<AdminAgentRun>;
  completeRun: (runId: string, input: AdminAgentCompleteRunInput) => Promise<void>;
};

export function useStartRun(state: RecoveryState) {
  const stateRef = useLatestValue(state);
  return useCallback(
    (prompt: string, retryOfRunId?: string) => startRun(stateRef.current, prompt, retryOfRunId),
    [stateRef],
  );
}

export function useCompleteRun(state: RecoveryState) {
  const stateRef = useLatestValue(state);
  return useCallback(
    (runId: string, input: AdminAgentCompleteRunInput) =>
      completeRun(stateRef.current, runId, input),
    [stateRef],
  );
}

export function useRunProgress(
  state: RecoveryState,
  sendHeartbeat: (runId: string) => Promise<void>,
) {
  const stateRef = useLatestValue(state);
  const reportProgress = useCallback(
    (update: Partial<AdminAgentHeartbeatRunInput>) => {
      const recovery = stateRef.current;
      recovery.progressRef.current = mergeAdminAgentRunProgress(
        recovery.progressRef.current,
        normalizeProgress(update),
      );
    },
    [stateRef],
  );
  const setRunPhase = useCallback(
    async (status: AdminAgentHeartbeatRunInput['status'], step: string) => {
      const runId = stateRef.current.localRunIdRef.current;
      if (!runId) return;
      reportProgress({ status, currentStep: step });
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
  return { reportProgress, markWaiting, markRunning };
}

async function startRun(state: RecoveryState, prompt: string, retryOfRunId?: string) {
  const conversationId = state.conversationIdRef.current;
  if (!conversationId) throw new Error('请先创建或选择一个对话。');
  try {
    const run = await createAdminAgentRun(conversationId, {
      prompt,
      clientRequestId: crypto.randomUUID(),
      ...(retryOfRunId ? { retryOfRunId } : {}),
    });
    if (state.conversationIdRef.current !== conversationId) {
      await cancelUnstartedRun(run.id);
      throw new Error('对话已切换，本次任务未执行。');
    }
    activateRun(state, run, conversationId);
    return run;
  } catch (reason) {
    const message = errorMessage(reason, '无法创建运行记录，任务未执行。');
    if (state.conversationIdRef.current === conversationId) state.setError(message);
    throw new Error(message, { cause: reason });
  }
}

function activateRun(state: RecoveryState, run: AdminAgentRun, conversationId: string) {
  state.runConversationsRef.current.set(run.id, conversationId);
  state.progressRef.current = { status: 'running', currentStep: '任务已开始', tokenCount: 0 };
  state.localRunIdRef.current = run.id;
  state.setLocalRunId(run.id);
  state.setLatestRun(run);
  state.setRunHistory((current) =>
    [run, ...current.filter((item) => item.id !== run.id)].slice(0, RUN_HISTORY_LIMIT),
  );
  state.setError(null);
}

async function completeRun(state: RecoveryState, runId: string, input: AdminAgentCompleteRunInput) {
  const runConversationId = state.runConversationsRef.current.get(runId);
  deactivateRun(state, runId);
  try {
    const updated = await completeAdminAgentRun(
      runId,
      withProgress(input, state.progressRef.current),
    );
    if (state.conversationIdRef.current !== updated.conversationId) return;
    state.setLatestRun(updated);
    state.setRunHistory((current) =>
      [updated, ...current.filter((item) => item.id !== updated.id)].slice(0, RUN_HISTORY_LIMIT),
    );
    state.setError(null);
  } catch (reason) {
    if (state.conversationIdRef.current === runConversationId) {
      state.setError(errorMessage(reason, '运行结果保存失败，系统会将其识别为中断任务。'));
    }
  } finally {
    state.runConversationsRef.current.delete(runId);
  }
}

function deactivateRun(state: RecoveryState, runId: string) {
  if (state.localRunIdRef.current !== runId) return;
  state.localRunIdRef.current = null;
  state.setLocalRunId(null);
}

async function cancelUnstartedRun(runId: string) {
  try {
    await completeAdminAgentRun(runId, {
      status: 'cancelled',
      errorCode: 'CONVERSATION_CHANGED',
      errorSummary: '对话已切换，任务未执行。',
    });
  } catch {
    // 服务恢复后会通过心跳超时把该记录归类为中断。
  }
}

function normalizeProgress(update: Partial<AdminAgentHeartbeatRunInput>) {
  return {
    ...update,
    ...(update.currentStep ? { currentStep: update.currentStep.slice(0, MAX_STEP_LENGTH) } : {}),
  };
}

function withProgress(input: AdminAgentCompleteRunInput, progress: AdminAgentHeartbeatRunInput) {
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
