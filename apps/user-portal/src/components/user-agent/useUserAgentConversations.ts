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
import { createSingleFlightRunner } from './conversation-creation';
import { runConversationMutation } from './conversation-management';
import { reconcilePersistedConversation } from './conversation-persistence';
import {
  createConversationSelectionCleanup,
  createLatestConversationSelectionRunner,
} from './conversation-selection';

type State = ReturnType<typeof useConversationState>;
type SelectionRunner = ReturnType<typeof createLatestConversationSelectionRunner>;

export function useUserAgentConversations() {
  const state = useConversationState();
  const [selectionRunner] = useState(createLatestConversationSelectionRunner);
  const [creationRunner] = useState(() => createSingleFlightRunner<UserAgentConversation | null>());
  useEffect(() => createConversationSelectionCleanup(selectionRunner), [selectionRunner]);
  const selectConversation = useSelectConversation(state, selectionRunner);
  const createConversation = useCreateConversation(state, selectionRunner, creationRunner);
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

function useSelectConversation(state: State, selection: SelectionRunner) {
  const { setActiveConversation, setActiveId, setError, setLoading } = state;
  return useCallback(
    async (conversationId: string) => {
      setLoading(true);
      setError(null);
      setActiveId(conversationId);
      setActiveConversation(null);
      return selection.run({
        load: () => getUserAgentConversation(conversationId),
        onError: (reason) => setError(messageOf(reason, '无法加载历史对话。')),
        onSettled: () => setLoading(false),
        onSuccess: setActiveConversation,
      });
    },
    [selection, setActiveConversation, setActiveId, setError, setLoading],
  );
}

function useCreateConversation(
  state: State,
  selection: SelectionRunner,
  runCreation: (
    action: () => Promise<UserAgentConversation | null>,
  ) => Promise<UserAgentConversation | null>,
) {
  const { setActiveConversation, setActiveId, setError, setLoading, setSummaries } = state;
  return useCallback(
    () =>
      runCreation(async () => {
        const activationToken = selection.invalidate();
        setLoading(true);
        setError(null);
        setActiveId(null);
        setActiveConversation(null);
        try {
          const created = await createUserAgentConversation();
          const conversation = { ...created, messages: [] } as UserAgentConversation;
          setSummaries((current) => [created, ...current]);
          if (selection.isCurrent(activationToken)) {
            setActiveId(created.id);
            setActiveConversation(conversation);
          }
          return conversation;
        } catch (reason) {
          if (selection.isCurrent(activationToken)) {
            setError(messageOf(reason, '无法新建对话。'));
          }
          return null;
        } finally {
          if (selection.isCurrent(activationToken)) setLoading(false);
        }
      }),
    [
      runCreation,
      selection,
      setActiveConversation,
      setActiveId,
      setError,
      setLoading,
      setSummaries,
    ],
  );
}

function useRemoveConversation(
  state: State,
  selectConversation: (conversationId: string) => Promise<boolean>,
  createConversation: () => Promise<UserAgentConversation | null>,
) {
  const { activeId, setActiveConversation, setActiveId, setError, setSummaries, summaries } = state;
  return useCallback(
    async (conversationId: string) => {
      const outcome = await runConversationMutation({
        action: () => deleteUserAgentConversation(conversationId),
        fallbackMessage: '无法删除对话。',
      });
      if (!outcome.success) {
        setError(outcome.message);
        return false;
      }
      const next = summaries.filter((item) => item.id !== conversationId);
      setSummaries(next);
      setError(null);
      if (activeId !== conversationId) return true;
      const replacement = next[0];
      if (replacement) await selectConversation(replacement.id);
      else {
        setActiveId(null);
        setActiveConversation(null);
        await createConversation();
      }
      return true;
    },
    [
      activeId,
      createConversation,
      selectConversation,
      setActiveConversation,
      setActiveId,
      setError,
      setSummaries,
      summaries,
    ],
  );
}

function useRenameConversation(state: State) {
  const { setActiveConversation, setError, setSummaries } = state;
  return useCallback(
    async (conversationId: string, title: string) => {
      const outcome = await runConversationMutation({
        action: () => renameUserAgentConversation(conversationId, title),
        fallbackMessage: '无法重命名对话。',
      });
      if (!outcome.success) {
        setError(outcome.message);
        return false;
      }
      const updated = outcome.value;
      setSummaries((current) =>
        current.map((item) => (item.id === conversationId ? updated : item)),
      );
      setActiveConversation((current) =>
        current?.id === conversationId ? { ...current, ...updated } : current,
      );
      setError(null);
      return true;
    },
    [setActiveConversation, setError, setSummaries],
  );
}

function usePersistMessages(state: State) {
  const { setActiveConversation, setSummaries } = state;
  return useCallback(
    async (conversationId: string, messages: UserAgentMessageInput[]) => {
      const next = await appendUserAgentMessages(conversationId, messages);
      setActiveConversation((current) => reconcilePersistedConversation(current, next));
      setSummaries((current) => upsertSummary(current, next));
      return next;
    },
    [setActiveConversation, setSummaries],
  );
}

function useConversationBootstrap(
  state: State,
  selectConversation: (conversationId: string) => Promise<boolean>,
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
