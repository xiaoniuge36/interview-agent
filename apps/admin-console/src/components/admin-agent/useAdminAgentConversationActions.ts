import { useCallback, type Dispatch, type SetStateAction } from 'react';
import {
  appendAdminAgentMessages,
  createAdminAgentConversation,
  deleteAdminAgentConversation,
  getAdminAgentConversation,
  renameAdminAgentConversation,
  type AdminAgentConversation,
  type AdminAgentConversationSummary,
  type AdminAgentMessageInput,
} from '@/lib/admin-page-agent-conversation-api';

type State = {
  setSummaries: Dispatch<SetStateAction<AdminAgentConversationSummary[]>>;
  setActiveId: Dispatch<SetStateAction<string | null>>;
  setActiveConversation: Dispatch<SetStateAction<AdminAgentConversation | null>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
};

export function useSelectAdminAgentConversation(state: State) {
  return useCallback(
    async (conversationId: string) => {
      state.setLoading(true);
      state.setError(null);
      state.setActiveId(conversationId);
      state.setActiveConversation(null);
      try {
        const conversation = await getAdminAgentConversation(conversationId);
        state.setActiveConversation(conversation);
      } catch (reason) {
        state.setError(errorMessage(reason, '无法加载历史对话。'));
      } finally {
        state.setLoading(false);
      }
    },
    [state],
  );
}

export function useCreateAdminAgentConversation(state: State) {
  return useCallback(async () => {
    state.setError(null);
    try {
      const created = await createAdminAgentConversation();
      const conversation = { ...created, messages: [] } satisfies AdminAgentConversation;
      state.setSummaries((current) => [created, ...current]);
      state.setActiveId(created.id);
      state.setActiveConversation(conversation);
      return conversation;
    } catch (reason) {
      state.setError(errorMessage(reason, '无法新建对话。'));
      return null;
    }
  }, [state]);
}

export function useRenameAdminAgentConversation(state: State) {
  return useCallback(
    async (conversationId: string, title: string) => {
      const updated = await renameAdminAgentConversation(conversationId, title);
      state.setSummaries((current) =>
        current.map((item) => (item.id === conversationId ? updated : item)),
      );
      state.setActiveConversation((current) =>
        current?.id === conversationId ? { ...current, ...updated } : current,
      );
    },
    [state],
  );
}

export function useRemoveAdminAgentConversation(
  state: State,
  options: {
    summaries: AdminAgentConversationSummary[];
    activeId: string | null;
    select: (id: string) => Promise<void>;
  },
) {
  return useCallback(
    async (conversationId: string) => {
      await deleteAdminAgentConversation(conversationId);
      const next = options.summaries.filter((item) => item.id !== conversationId);
      state.setSummaries(next);
      if (options.activeId !== conversationId) return;
      const replacement = next[0];
      if (replacement) await options.select(replacement.id);
      else {
        state.setActiveId(null);
        state.setActiveConversation(null);
      }
    },
    [options, state],
  );
}

export function usePersistAdminAgentMessages(state: State) {
  return useCallback(
    async (conversationId: string, messages: AdminAgentMessageInput[]) => {
      const next = await appendAdminAgentMessages(conversationId, messages);
      state.setActiveConversation(next);
      state.setSummaries((current) => upsertSummary(current, next));
      return next;
    },
    [state],
  );
}

function upsertSummary(
  summaries: AdminAgentConversationSummary[],
  conversation: AdminAgentConversation,
) {
  const summary: AdminAgentConversationSummary = {
    id: conversation.id,
    title: conversation.title,
    messageCount: conversation.messageCount,
    lastMessagePreview: conversation.messages.at(-1)?.content ?? null,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
  return [summary, ...summaries.filter((item) => item.id !== summary.id)];
}

function errorMessage(reason: unknown, fallback: string) {
  return reason instanceof Error ? reason.message : fallback;
}
