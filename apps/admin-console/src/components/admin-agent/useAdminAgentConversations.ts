import { useEffect, useMemo, useState } from 'react';
import {
  listAdminAgentConversations,
  type AdminAgentConversation,
  type AdminAgentConversationSummary,
} from '@/lib/admin-page-agent-conversation-api';
import {
  useCreateAdminAgentConversation,
  usePersistAdminAgentMessages,
  useRemoveAdminAgentConversation,
  useRenameAdminAgentConversation,
  useSelectAdminAgentConversation,
} from './useAdminAgentConversationActions';

export function useAdminAgentConversations(enabled: boolean) {
  const [summaries, setSummaries] = useState<AdminAgentConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<AdminAgentConversation | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const state = useMemo(
    () => ({ setSummaries, setActiveId, setActiveConversation, setLoading, setError }),
    [],
  );
  const selectConversation = useSelectAdminAgentConversation(state);
  const createConversation = useCreateAdminAgentConversation(state);
  const renameConversation = useRenameAdminAgentConversation(state);
  const removeConversation = useRemoveAdminAgentConversation(state, {
    summaries,
    activeId,
    select: selectConversation,
  });
  const persistMessages = usePersistAdminAgentMessages(state);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void listAdminAgentConversations(controller.signal)
      .then((next) => {
        setSummaries(next);
        const first = next[0];
        if (first) void selectConversation(first.id);
        else void createConversation().finally(() => setLoading(false));
      })
      .catch((reason) => {
        if (reason instanceof Error && reason.name === 'AbortError') return;
        setError(reason instanceof Error ? reason.message : '无法加载历史对话。');
        setLoading(false);
      });
    return () => controller.abort();
  }, [createConversation, enabled, selectConversation]);

  return {
    summaries,
    activeId,
    activeConversation,
    loading,
    error,
    createConversation,
    selectConversation,
    renameConversation,
    removeConversation,
    persistMessages,
  };
}
