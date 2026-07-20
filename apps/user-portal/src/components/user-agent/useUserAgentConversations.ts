import { useCallback, useEffect, useMemo, useState } from 'react';
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

export function useUserAgentConversations() {
  const [summaries, setSummaries] = useState<UserAgentConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<UserAgentConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectConversation = useCallback(async (conversationId: string) => {
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
  }, []);
  const createConversation = useCallback(async () => {
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
  }, []);
  const removeConversation = useCallback(async (conversationId: string) => {
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
  }, [activeId, createConversation, selectConversation, summaries]);
  const renameConversation = useCallback(async (conversationId: string, title: string) => {
    const updated = await renameUserAgentConversation(conversationId, title);
    setSummaries((current) => current.map((item) => (item.id === conversationId ? updated : item)));
    setActiveConversation((current) => (current?.id === conversationId ? { ...current, ...updated } : current));
  }, []);
  const persistMessages = useCallback(async (conversationId: string, messages: UserAgentMessageInput[]) => {
    const next = await appendUserAgentMessages(conversationId, messages);
    setActiveConversation(next);
    setSummaries((current) => upsertSummary(current, next));
    return next;
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void listUserAgentConversations()
      .then(async (next) => {
        setSummaries(next);
        const first = next[0];
        if (first) await selectConversation(first.id);
        else await createConversation();
      })
      .catch((reason) => {
        if (reason instanceof Error && reason.name === 'AbortError') return;
        setError(messageOf(reason, '无法加载历史对话。'));
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [createConversation, selectConversation]);
  return useMemo(() => ({
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
  }), [activeConversation, activeId, createConversation, error, loading, persistMessages, removeConversation, renameConversation, selectConversation, summaries]);
}

function upsertSummary(summaries: UserAgentConversationSummary[], conversation: UserAgentConversation) {
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
