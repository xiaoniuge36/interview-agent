import type { PageAgentCore } from '@page-agent/core';
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import type { AdminAgentMessageInput } from '@/lib/admin-page-agent-conversation-api';
import type { AdminPageAgentConfig } from '@/lib/admin-page-agent-api';

type ConversationMessage = { id: string; role: 'user' | 'assistant' | 'error'; content: string };

export type AgentMessage = {
  id: string;
  role: 'user' | 'assistant' | 'activity' | 'error';
  content: string;
};
const MAX_MESSAGE_LENGTH = 4_000;
const EMPTY_CONVERSATION_MESSAGES: readonly ConversationMessage[] = [];

export function useAdminAgentConversation(
  agentRef: MutableRefObject<PageAgentCore | null>,
  config: AdminPageAgentConfig | null,
  options?: {
    conversationId: string | null;
    initialMessages: readonly ConversationMessage[];
    persistMessages: (
      conversationId: string,
      messages: AdminAgentMessageInput[],
    ) => Promise<unknown>;
  },
) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const pendingAnswer = useRef<((value: string) => void) | null>(null);
  const conversationId = options?.conversationId ?? null;
  const incomingMessages = options?.initialMessages;
  const initialMessages = useMemo(
    () => incomingMessages ?? EMPTY_CONVERSATION_MESSAGES,
    [incomingMessages],
  );
  const persistMessages = options?.persistMessages;
  useEffect(() => {
    setMessages(initialMessages.map((item) => ({ ...item })));
    pendingAnswer.current = null;
    setPendingQuestion(null);
  }, [conversationId, initialMessages]);
  const question = useAgentQuestion({ pendingAnswer, setMessages, setPendingQuestion });
  const submit = useCallback(
    (value: string) =>
      executeConversationTask({
        value,
        agent: agentRef.current,
        configMessage: config?.message,
        conversationId,
        persistMessages,
        setMessages,
      }),
    [agentRef, config?.message, conversationId, persistMessages],
  );
  const stop = useCallback(() => void agentRef.current?.stop(), [agentRef]);
  return {
    messages,
    pendingQuestion,
    askUser: question.askUser,
    answerQuestion: question.answerQuestion,
    submit,
    stop,
  };
}

function useAgentQuestion(props: {
  pendingAnswer: MutableRefObject<((value: string) => void) | null>;
  setMessages: (update: (current: AgentMessage[]) => AgentMessage[]) => void;
  setPendingQuestion: (question: string | null) => void;
}) {
  const { pendingAnswer, setMessages, setPendingQuestion } = props;
  const askUser = useCallback(
    (question: string, options?: { signal: AbortSignal }) =>
      new Promise<string>((resolve, reject) => {
        pendingAnswer.current = resolve;
        setPendingQuestion(question);
        setMessages((current) => [...current, message('activity', `Agent 需要确认：${question}`)]);
        options?.signal.addEventListener(
          'abort',
          () => {
            pendingAnswer.current = null;
            setPendingQuestion(null);
            reject(options.signal.reason);
          },
          { once: true },
        );
      }),
    [pendingAnswer, setMessages, setPendingQuestion],
  );
  const answerQuestion = useCallback(
    (answer: string) => {
      pendingAnswer.current?.(answer);
      pendingAnswer.current = null;
      setPendingQuestion(null);
    },
    [pendingAnswer, setPendingQuestion],
  );
  return { askUser, answerQuestion };
}

type PersistContext = {
  persist: (conversationId: string, messages: AdminAgentMessageInput[]) => Promise<unknown>;
  conversationId: string;
  next: AdminAgentMessageInput[];
  setMessages: (update: (current: AgentMessage[]) => AgentMessage[]) => void;
};

type SubmitContext = {
  value: string;
  agent: PageAgentCore | null;
  configMessage: string | null | undefined;
  conversationId: string | null;
  setMessages: (update: (current: AgentMessage[]) => AgentMessage[]) => void;
  persistMessages:
    ((conversationId: string, messages: AdminAgentMessageInput[]) => Promise<unknown>) | undefined;
};

async function executeConversationTask(context: SubmitContext) {
  const task = context.value.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!task) return;
  context.setMessages((current) => [...current, message('user', task)]);
  if (!context.agent) {
    context.setMessages((current) => [
      ...current,
      message('error', context.configMessage ?? '请先连接一个可用模型。'),
    ]);
    return;
  }
  await persistTaskMessage(context, [{ role: 'user', content: task }]);
  try {
    const result = await context.agent.execute(task);
    const role = result.success ? 'assistant' : 'error';
    const content = result.data || '执行未完成，请查看执行过程。';
    context.setMessages((current) => [...current, message(role, content)]);
    void persistTaskMessage(context, [{ role, content }]);
  } catch (error) {
    const content = error instanceof Error ? error.message : 'Agent 执行失败，请稍后重试。';
    context.setMessages((current) => [...current, message('error', content)]);
    void persistTaskMessage(context, [{ role: 'error', content }]);
  }
}

async function persistTaskMessage(context: SubmitContext, next: AdminAgentMessageInput[]) {
  if (!context.persistMessages || !context.conversationId) return;
  await persistMessagesSafely({
    persist: context.persistMessages,
    conversationId: context.conversationId,
    next,
    setMessages: context.setMessages,
  });
}

async function persistMessagesSafely(context: PersistContext) {
  try {
    await context.persist(context.conversationId, context.next);
  } catch (error) {
    const content = error instanceof Error ? error.message : '对话保存失败，请稍后重试。';
    context.setMessages((current) => [...current, message('error', content)]);
  }
}

function message(role: AgentMessage['role'], content: string): AgentMessage {
  return { id: crypto.randomUUID(), role, content };
}
