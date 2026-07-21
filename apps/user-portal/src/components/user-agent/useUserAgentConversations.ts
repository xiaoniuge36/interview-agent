import { useCallback, useEffect, useState } from 'react';
import {
  appendUserAgentMessages,
  createUserAgentConversation,
  deleteUserAgentConversation,
  getUserAgentConversation,
  listUserAgentConversations,
  renameUserAgentConversation,
  type UserAgentConversation,
  type UserAgentConversationSummary,
  type UserAgentMessageInput,
} from '@/lib/user-agent-conversation-api';

type State = ReturnType<typeof useConversationState>;

export function useUserAgentConversations() {
  const state = useConversationState();
  const selectConversation = useSelectConversation(state);
  const createConversation = useCreateConversation(state);
  const removeConversation = useRemoveConversation(state, selectConversation, createConversation);
  const renameConversation = useRenameConversation(state);
  const persistMessages = usePersistMessages(state);
  useConversationBootstrap(state, selectConversation, createConversation);
  return {
    summaries: state.summaries,
    activeId: state.activeId,
    activeConversation: state.activeConversation,
    loading: state.loading,
    error: state.error,
    createConversation,
    selectConversation,
    renameConversation,
    removeConversation,
    persistMessages,
  };
}

function useConversationState() {
  const [summaries, setSummaries] = useState<UserAgentConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<UserAgentConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  return {
    summaries,
    setSummaries,
    activeId,
    setActiveId,
    activeConversation,
    setActiveConversation,
    loading,
    setLoading,
    error,
    setError,
  };
}

function useSelectConversation(state: State) {
  const { setActiveConversation, setActiveId, setError, setLoading } = state;
  return useCallback(
    async (conversationId: string) => {
      setLoading(true);
      setError(null);
      setActiveId(conversationId);
      try {
        setActiveConversation(await getUserAgentConversation(conversationId));
      } catch (reason) {
        setError(messageOf(reason, '无法加载历史对话。'));
      } finally {
        setLoading(false);
      }
    },
    [setActiveConversation, setActiveId, setError, setLoading],
  );
}

function useCreateConversation(state: State) {
  const { setActiveConversation, setActiveId, setError, setSummaries } = state;
  return useCallback(async () => {
    try {
      const created = await createUserAgentConversation();
      const conversation = { ...created, messages: [] } as UserAgentConversation;
      setSummaries((current) => [created, ...current]);
      setActiveId(created.id);
      setActiveConversation(conversation);
      setError(null);
      return conversation;
    } catch (reason) {
      setError(messageOf(reason, '无法新建对话。'));
      return null;
    }
  }, [setActiveConversation, setActiveId, setError, setSummaries]);
}

function useRemoveConversation(
  state: State,
  selectConversation: (conversationId: string) => Promise<void>,
  createConversation: () => Promise<UserAgentConversation | null>,
) {
  const { activeId, setActiveConversation, setActiveId, setSummaries, summaries } = state;
  return useCallback(
    async (conversationId: string) => {
      await deleteUserAgentConversation(conversationId);
      const next = summaries.filter((item) => item.id !== conversationId);
      setSummaries(next);
      if (activeId !== conversationId) return;
      const replacement = next[0];
      if (replacement) await selectConversation(replacement.id);
      else {
        setActiveId(null);
        setActiveConversation(null);
        await createConversation();
      }
    },
    [
      activeId,
      createConversation,
      selectConversation,
      setActiveConversation,
      setActiveId,
      setSummaries,
      summaries,
    ],
  );
}

function useRenameConversation(state: State) {
  const { setActiveConversation, setSummaries } = state;
  return useCallback(
    async (conversationId: string, title: string) => {
      const updated = await renameUserAgentConversation(conversationId, title);
      setSummaries((current) =>
        current.map((item) => (item.id === conversationId ? updated : item)),
      );
      setActiveConversation((current) =>
        current?.id === conversationId ? { ...current, ...updated } : current,
      );
    },
    [setActiveConversation, setSummaries],
  );
}

function usePersistMessages(state: State) {
  const { setActiveConversation, setSummaries } = state;
  return useCallback(
    async (conversationId: string, messages: UserAgentMessageInput[]) => {
      const next = await appendUserAgentMessages(conversationId, messages);
      setActiveConversation(next);
      setSummaries((current) => upsertSummary(current, next));
      return next;
    },
    [setActiveConversation, setSummaries],
  );
}

function useConversationBootstrap(
  state: State,
  selectConversation: (conversationId: string) => Promise<void>,
  createConversation: () => Promise<UserAgentConversation | null>,
) {
  const { setError, setLoading, setSummaries } = state;
  useEffect(() => {
    let active = true;
    void listUserAgentConversations()
      .then(async (next) => {
        if (!active) return;
        setSummaries(next);
        if (next[0]) await selectConversation(next[0].id);
        else await createConversation();
      })
      .catch((reason) => {
        if (active) setError(messageOf(reason, '无法加载历史对话。'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [createConversation, selectConversation, setError, setLoading, setSummaries]);
}

function upsertSummary(
  summaries: UserAgentConversationSummary[],
  conversation: UserAgentConversation,
) {
  const summary = {
    id: conversation.id,
    title: conversation.title,
    messageCount: conversation.messageCount,
    lastMessagePreview: conversation.messages.at(-1)?.content ?? null,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
  return [summary, ...summaries.filter((item) => item.id !== summary.id)];
}

function messageOf(reason: unknown, fallback: string) {
  return reason instanceof Error ? reason.message : fallback;
}
