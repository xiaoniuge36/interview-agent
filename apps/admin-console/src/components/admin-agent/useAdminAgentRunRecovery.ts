import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import {
  getAdminAgentRunHistory,
  heartbeatAdminAgentRun,
  type AdminAgentHeartbeatRunInput,
  type AdminAgentRun,
} from '@/lib/admin-page-agent-run-api';
import { shouldRefreshAdminAgentRun } from './admin-agent-run-recovery-model';
import {
  useCompleteRun,
  useRunProgress,
  useStartRun,
  type AdminAgentRunLifecycle,
} from './useAdminAgentRunLifecycle';

const HEARTBEAT_INTERVAL_MS = 15_000;
const REMOTE_RUN_POLL_INTERVAL_MS = 15_000;
const RUN_HISTORY_LIMIT = 8;

export type { AdminAgentRunLifecycle } from './useAdminAgentRunLifecycle';

export type RecoveryState = {
  latestRun: AdminAgentRun | null;
  setLatestRun: Dispatch<SetStateAction<AdminAgentRun | null>>;
  runHistory: AdminAgentRun[];
  setRunHistory: Dispatch<SetStateAction<AdminAgentRun[]>>;
  localRunId: string | null;
  setLocalRunId: Dispatch<SetStateAction<string | null>>;
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  localRunIdRef: { current: string | null };
  progressRef: { current: AdminAgentHeartbeatRunInput };
  conversationIdRef: { current: string | null };
  runConversationsRef: { current: Map<string, string> };
};

export function useAdminAgentRunRecovery(conversationId: string | null) {
  const state = useRecoveryState(conversationId);
  const transport = useRunTransport(state);
  useRunTimers(state, transport);
  const startRun = useStartRun(state);
  const completeRun = useCompleteRun(state);
  const progress = useRunProgress(state, transport.sendHeartbeat);
  return {
    latestRun: state.latestRun,
    runHistory: state.runHistory,
    error: state.error,
    startRun,
    completeRun,
    reportProgress: progress.reportProgress,
    markWaiting: progress.markWaiting,
    markRunning: progress.markRunning,
  } satisfies AdminAgentRunLifecycle & {
    latestRun: AdminAgentRun | null;
    runHistory: AdminAgentRun[];
    error: string | null;
    reportProgress: typeof progress.reportProgress;
    markWaiting: typeof progress.markWaiting;
    markRunning: typeof progress.markRunning;
  };
}

function useRecoveryState(conversationId: string | null): RecoveryState {
  const [latestRun, setLatestRun] = useState<AdminAgentRun | null>(null);
  const [runHistory, setRunHistory] = useState<AdminAgentRun[]>([]);
  const [localRunId, setLocalRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const localRunIdRef = useRef<string | null>(null);
  const progressRef = useRef<AdminAgentHeartbeatRunInput>({ status: 'running' });
  const conversationIdRef = useRef(conversationId);
  const runConversationsRef = useRef(new Map<string, string>());
  conversationIdRef.current = conversationId;
  useEffect(() => {
    localRunIdRef.current = null;
    progressRef.current = { status: 'running' };
    setLocalRunId(null);
    setLatestRun(null);
    setRunHistory([]);
    setError(null);
    return loadConversationRuns({ conversationId, setLatestRun, setRunHistory, setError });
  }, [conversationId]);
  return {
    latestRun,
    setLatestRun,
    runHistory,
    setRunHistory,
    localRunId,
    setLocalRunId,
    error,
    setError,
    localRunIdRef,
    progressRef,
    conversationIdRef,
    runConversationsRef,
  };
}

function useRunTransport(state: RecoveryState) {
  const { conversationIdRef, localRunIdRef, progressRef, setError, setLatestRun, setRunHistory } =
    state;
  const sendHeartbeat = useCallback(
    async (runId: string) => {
      try {
        const updated = await heartbeatAdminAgentRun(runId, progressRef.current);
        if (localRunIdRef.current !== runId) return;
        setLatestRun(updated);
        setRunHistory((current) =>
          [updated, ...current.filter((run) => run.id !== updated.id)].slice(0, RUN_HISTORY_LIMIT),
        );
        setError(null);
      } catch (reason) {
        if (localRunIdRef.current === runId) {
          setError(errorMessage(reason, '运行状态同步失败，系统会保留中断记录。'));
        }
      }
    },
    [localRunIdRef, progressRef, setError, setLatestRun, setRunHistory],
  );
  const refreshHistory = useCallback(async () => {
    const conversationId = conversationIdRef.current;
    if (!conversationId) return;
    try {
      const runs = await getAdminAgentRunHistory(conversationId);
      setRunHistory(runs);
      setLatestRun(runs[0] ?? null);
      setError(null);
    } catch (reason) {
      setError(errorMessage(reason, '无法读取上次运行状态。'));
    }
  }, [conversationIdRef, setError, setLatestRun, setRunHistory]);
  return { sendHeartbeat, refreshHistory };
}

function useRunTimers(state: RecoveryState, transport: ReturnType<typeof useRunTransport>) {
  const { sendHeartbeat, refreshHistory } = transport;
  useEffect(() => {
    if (!state.localRunId) return;
    const timer = window.setInterval(
      () => void sendHeartbeat(state.localRunId!),
      HEARTBEAT_INTERVAL_MS,
    );
    return () => window.clearInterval(timer);
  }, [sendHeartbeat, state.localRunId]);
  useEffect(() => {
    if (!shouldRefreshAdminAgentRun(state.latestRun, state.localRunId, state.error)) return;
    const timer = window.setInterval(() => void refreshHistory(), REMOTE_RUN_POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [refreshHistory, state.error, state.latestRun, state.localRunId]);
}

function loadConversationRuns({
  conversationId,
  setLatestRun,
  setRunHistory,
  setError,
}: {
  conversationId: string | null;
  setLatestRun: (run: AdminAgentRun | null) => void;
  setRunHistory: (runs: AdminAgentRun[]) => void;
  setError: (message: string | null) => void;
}) {
  if (!conversationId) return;
  const controller = new AbortController();
  void getAdminAgentRunHistory(conversationId, controller.signal)
    .then((runs) => {
      setRunHistory(runs);
      setLatestRun(runs[0] ?? null);
    })
    .catch((reason) => {
      if (!(reason instanceof Error && reason.name === 'AbortError')) {
        setError(errorMessage(reason, '无法读取上次运行状态。'));
      }
    });
  return () => controller.abort();
}

function errorMessage(reason: unknown, fallback: string) {
  return reason instanceof Error ? reason.message : fallback;
}
