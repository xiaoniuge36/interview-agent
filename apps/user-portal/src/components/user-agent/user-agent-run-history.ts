import { getUserAgentRunHistory, type UserAgentRun } from '@/lib/user-page-agent-run-api';

export function loadConversationRuns({
  conversationId,
  setLatestRun,
  setRunHistory,
  setError,
}: {
  conversationId: string | null;
  setLatestRun: (run: UserAgentRun | null) => void;
  setRunHistory: (runs: UserAgentRun[]) => void;
  setError: (message: string | null) => void;
}) {
  if (!conversationId) return;
  const controller = new AbortController();
  void getUserAgentRunHistory(conversationId, controller.signal)
    .then((runs) => {
      setRunHistory(runs);
      setLatestRun(runs[0] ?? null);
    })
    .catch((reason) => {
      if (!(reason instanceof Error && reason.name === 'AbortError'))
        setError(reason instanceof Error ? reason.message : '无法读取上次训练运行状态。');
    });
  return () => controller.abort();
}
