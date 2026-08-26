import type { PageAgentRun } from '@interview-agent/contracts';
import type {
  PageAgentCompleteRunInput,
  PageAgentCreateRunInput,
  PageAgentHeartbeatRunInput,
} from './requests';

const RUN_HISTORY_LIMIT = 8;

export type PageAgentRunRecoveryApi = {
  getRunHistory: (conversationId: string, signal?: AbortSignal) => Promise<PageAgentRun[]>;
  createRun: (conversationId: string, input: PageAgentCreateRunInput) => Promise<PageAgentRun>;
  heartbeatRun: (runId: string, input: PageAgentHeartbeatRunInput) => Promise<PageAgentRun>;
  completeRun: (runId: string, input: PageAgentCompleteRunInput) => Promise<PageAgentRun>;
};

export type PageAgentRunRecoveryMessages = {
  /** 读取运行历史失败时的兜底文案。 */
  historyUnavailable: string;
  /** 对话切换后取消未执行 run 的 errorSummary。 */
  cancelledRunSummary: string;
};

export type PageAgentRunRecoveryOptions = {
  api: PageAgentRunRecoveryApi;
  messages: PageAgentRunRecoveryMessages;
};

export type PageAgentRecoveryStore = {
  setLatestRun: (run: PageAgentRun | null) => void;
  setRunHistory: (value: PageAgentRun[] | ((current: PageAgentRun[]) => PageAgentRun[])) => void;
  setActiveRunId: (runId: string | null) => void;
  setError: (message: string | null) => void;
  activeRunIdRef: { current: string | null };
  progressRef: { current: PageAgentHeartbeatRunInput };
  conversationIdRef: { current: string | null };
  runConversationsRef: { current: Map<string, string> };
  optionsRef: { current: PageAgentRunRecoveryOptions };
};

export function loadConversationRuns(conversationId: string | null, store: PageAgentRecoveryStore) {
  if (!conversationId) return;
  const controller = new AbortController();
  void store.optionsRef.current.api
    .getRunHistory(conversationId, controller.signal)
    .then((runs) => {
      store.setRunHistory(runs);
      store.setLatestRun(runs[0] ?? null);
    })
    .catch((reason: unknown) => {
      if (!(reason instanceof Error && reason.name === 'AbortError'))
        store.setError(errorMessage(reason, store.optionsRef.current.messages.historyUnavailable));
    });
  return () => controller.abort();
}

export async function startPageAgentRun(
  store: PageAgentRecoveryStore,
  prompt: string,
  retryOfRunId?: string,
) {
  const conversationId = store.conversationIdRef.current;
  if (!conversationId) throw new Error('请先创建或选择一个对话。');
  try {
    const run = await store.optionsRef.current.api.createRun(conversationId, {
      prompt,
      clientRequestId: crypto.randomUUID(),
      ...(retryOfRunId ? { retryOfRunId } : {}),
    });
    if (store.conversationIdRef.current !== conversationId) {
      await cancelUnstartedRun(store, run.id);
      throw new Error('对话已切换，本次任务未执行。');
    }
    store.runConversationsRef.current.set(run.id, conversationId);
    store.progressRef.current = { status: 'running', currentStep: '任务已开始', tokenCount: 0 };
    store.activeRunIdRef.current = run.id;
    store.setActiveRunId(run.id);
    updateRunState(store, run);
    store.setError(null);
    return run;
  } catch (reason) {
    const message = errorMessage(reason, '无法创建运行记录，任务未执行。');
    if (store.conversationIdRef.current === conversationId) store.setError(message);
    throw new Error(message, { cause: reason });
  }
}

export async function completePageAgentRunRecord(
  store: PageAgentRecoveryStore,
  runId: string,
  input: PageAgentCompleteRunInput,
) {
  const conversationId = store.runConversationsRef.current.get(runId);
  deactivateRun(store, runId);
  try {
    const updated = await store.optionsRef.current.api.completeRun(
      runId,
      withProgress(input, store.progressRef.current),
    );
    if (store.conversationIdRef.current === updated.conversationId) updateRunState(store, updated);
    store.setError(null);
  } catch (reason) {
    if (store.conversationIdRef.current === conversationId)
      store.setError(errorMessage(reason, '运行结果保存失败，系统会将其识别为中断任务。'));
  } finally {
    store.runConversationsRef.current.delete(runId);
  }
}

export function updateRunState(store: PageAgentRecoveryStore, run: PageAgentRun) {
  store.setLatestRun(run);
  store.setRunHistory((current) =>
    [run, ...current.filter((item) => item.id !== run.id)].slice(0, RUN_HISTORY_LIMIT),
  );
}

export function errorMessage(reason: unknown, fallback: string) {
  return reason instanceof Error ? reason.message : fallback;
}

function deactivateRun(store: PageAgentRecoveryStore, runId: string) {
  if (store.activeRunIdRef.current !== runId) return;
  store.activeRunIdRef.current = null;
  store.setActiveRunId(null);
}

async function cancelUnstartedRun(store: PageAgentRecoveryStore, runId: string) {
  try {
    await store.optionsRef.current.api.completeRun(runId, {
      status: 'cancelled',
      errorCode: 'CONVERSATION_CHANGED',
      errorSummary: store.optionsRef.current.messages.cancelledRunSummary,
    });
  } catch {
    // 服务恢复后会按心跳超时将该记录归类为 interrupted。
  }
}

function withProgress(input: PageAgentCompleteRunInput, progress: PageAgentHeartbeatRunInput) {
  return {
    ...(progress.currentStep ? { currentStep: progress.currentStep } : {}),
    ...(progress.tokenCount === undefined ? {} : { tokenCount: progress.tokenCount }),
    ...input,
  };
}
