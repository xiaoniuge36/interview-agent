import type { PageAgentCore } from '@page-agent/core';
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import type { UserAgentMessageInput } from '@/lib/user-agent-conversation-api';
import type { UserPageAgentConfig } from '@/lib/user-page-agent-api';

type ConversationMessage = { id: string; role: 'user' | 'assistant' | 'error'; content: string };
export type UserAgentMessage = { id: string; role: 'user' | 'assistant' | 'activity' | 'error'; content: string };
const MAX_MESSAGE_LENGTH = 4_000;

export function useUserAgentConversation(
  agentRef: MutableRefObject<PageAgentCore | null>,
  config: UserPageAgentConfig | null,
  options: {
    conversationId: string | null;
    initialMessages: readonly ConversationMessage[];
    persistMessages: (conversationId: string, messages: UserAgentMessageInput[]) => Promise<unknown>;
  },
) {
  const [messages, setMessages] = useState<UserAgentMessage[]>([]);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const pendingAnswer = useRef<((value: string) => void) | null>(null);
  const initialMessages = useMemo(() => options.initialMessages, [options.initialMessages]);
  useEffect(() => {
    setMessages(initialMessages.map((item) => ({ ...item })));
    pendingAnswer.current = null;
    setPendingQuestion(null);
  }, [initialMessages, options.conversationId]);
  const askUser = useCallback(
    (question: string, askOptions?: { signal: AbortSignal }) =>
      new Promise<string>((resolve, reject) => {
        pendingAnswer.current = resolve;
        setPendingQuestion(question);
        setMessages((current) => [...current, message('activity', `需要你的确认：${question}`)]);
        askOptions?.signal.addEventListener('abort', () => {
          pendingAnswer.current = null;
          setPendingQuestion(null);
          reject(askOptions.signal.reason);
        }, { once: true });
      }),
    [],
  );
  const answerQuestion = useCallback((answer: string) => {
    pendingAnswer.current?.(answer);
    pendingAnswer.current = null;
    setPendingQuestion(null);
  }, []);
  const submit = useCallback(async (value: string) => {
    const task = value.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!task) return;
    setMessages((current) => [...current, message('user', task)]);
    if (!agentRef.current) {
      setMessages((current) => [...current, message('error', config?.message ?? '请先连接一个可用模型。')]);
      return;
    }
    await persistSafely(options.persistMessages, options.conversationId, [{ role: 'user', content: task }], setMessages);
    try {
      const result = await agentRef.current.execute(task);
      const role = result.success ? 'assistant' : 'error';
      const content = result.data || '本次建议没有完成，请稍后重试。';
      setMessages((current) => [...current, message(role, content)]);
      void persistSafely(options.persistMessages, options.conversationId, [{ role, content }], setMessages);
    } catch (error) {
      const content = error instanceof Error ? error.message : '刷题教练执行失败，请稍后重试。';
      setMessages((current) => [...current, message('error', content)]);
      void persistSafely(options.persistMessages, options.conversationId, [{ role: 'error', content }], setMessages);
    }
  }, [agentRef, config?.message, options.conversationId, options.persistMessages]);
  const stop = useCallback(() => void agentRef.current?.stop(), [agentRef]);
  return { messages, pendingQuestion, askUser, answerQuestion, submit, stop };
}

async function persistSafely(
  persist: (conversationId: string, messages: UserAgentMessageInput[]) => Promise<unknown>,
  conversationId: string | null,
  next: UserAgentMessageInput[],
  setMessages: (update: (current: UserAgentMessage[]) => UserAgentMessage[]) => void,
) {
  if (!conversationId) return;
  try {
    await persist(conversationId, next);
  } catch (error) {
    const content = error instanceof Error ? error.message : '对话保存失败，请稍后重试。';
    setMessages((current) => [...current, message('error', content)]);
  }
}

function message(role: UserAgentMessage['role'], content: string): UserAgentMessage {
  return { id: crypto.randomUUID(), role, content };
}
