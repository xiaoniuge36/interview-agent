import type { PageAgentCore } from '@page-agent/core';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import type { UserAgentMessageInput } from '@/lib/user-agent-conversation-api';
import type { UserPageAgentConfig } from '@/lib/user-page-agent-api';

type ConversationMessage = { id: string; role: 'user' | 'assistant' | 'error'; content: string };
export type UserAgentMessage = {
  id: string;
  role: 'user' | 'assistant' | 'activity' | 'error';
  content: string;
};
type SetMessages = Dispatch<SetStateAction<UserAgentMessage[]>>;
type ConversationOptions = {
  conversationId: string | null;
  initialMessages: readonly ConversationMessage[];
  persistMessages: (conversationId: string, messages: UserAgentMessageInput[]) => Promise<unknown>;
};
type SubmitOptions = {
  agentRef: MutableRefObject<PageAgentCore | null>;
  configMessage: string | null | undefined;
  conversationId: string | null;
  persist: ConversationOptions['persistMessages'];
  setMessages: SetMessages;
};
type PersistenceOptions = Pick<SubmitOptions, 'conversationId' | 'persist' | 'setMessages'>;
const MAX_MESSAGE_LENGTH = 4_000;

export function useUserAgentConversation(
  agentRef: MutableRefObject<PageAgentCore | null>,
  config: UserPageAgentConfig | null,
  options: ConversationOptions,
) {
  const [messages, setMessages] = useState<UserAgentMessage[]>([]);
  useConversationReset(options, setMessages);
  const question = useUserQuestion(setMessages, options.conversationId);
  const submit = useConversationSubmit({
    agentRef,
    configMessage: config?.message,
    conversationId: options.conversationId,
    persist: options.persistMessages,
    setMessages,
  });
  const stop = useCallback(() => void agentRef.current?.stop(), [agentRef]);
  return { messages, ...question, submit, stop };
}

function useConversationReset(options: ConversationOptions, setMessages: SetMessages) {
  useEffect(() => {
    setMessages(options.initialMessages.map((item) => ({ ...item })));
  }, [options.conversationId, options.initialMessages, setMessages]);
}

function useUserQuestion(setMessages: SetMessages, conversationId: string | null) {
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const pendingAnswer = useRef<((value: string) => void) | null>(null);
  useEffect(() => {
    pendingAnswer.current = null;
    setPendingQuestion(null);
  }, [conversationId]);
  const askUser = useCallback(
    (question: string, options?: { signal: AbortSignal }) =>
      new Promise<string>((resolve, reject) => {
        pendingAnswer.current = resolve;
        setPendingQuestion(question);
        appendMessage(setMessages, 'activity', `需要你的确认：${question}`);
        options?.signal.addEventListener('abort', abortQuestion, { once: true });
        function abortQuestion() {
          pendingAnswer.current = null;
          setPendingQuestion(null);
          reject(options?.signal.reason);
        }
      }),
    [setMessages],
  );
  const answerQuestion = useCallback((answer: string) => {
    pendingAnswer.current?.(answer);
    pendingAnswer.current = null;
    setPendingQuestion(null);
  }, []);
  return { pendingQuestion, askUser, answerQuestion };
}

function useConversationSubmit(options: SubmitOptions) {
  const { agentRef, configMessage, conversationId, persist, setMessages } = options;
  return useCallback(
    async (value: string) => {
      const task = value.trim().slice(0, MAX_MESSAGE_LENGTH);
      if (!task) return;
      appendMessage(setMessages, 'user', task);
      const agent = agentRef.current;
      if (!agent) {
        appendMessage(setMessages, 'error', configMessage ?? '请先连接一个可用模型。');
        return;
      }
      const persistence = { conversationId, persist, setMessages };
      await persistSafely(persistence, [{ role: 'user', content: task }]);
      await executeAgentTask(agent, task, persistence);
    },
    [agentRef, configMessage, conversationId, persist, setMessages],
  );
}

async function executeAgentTask(agent: PageAgentCore, task: string, options: PersistenceOptions) {
  try {
    const result = await agent.execute(task);
    const role = result.success ? 'assistant' : 'error';
    const content = result.data || '本次建议没有完成，请稍后重试。';
    appendMessage(options.setMessages, role, content);
    void persistSafely(options, [{ role, content }]);
  } catch (error) {
    const content = error instanceof Error ? error.message : '刷题教练执行失败，请稍后重试。';
    appendMessage(options.setMessages, 'error', content);
    void persistSafely(options, [{ role: 'error', content }]);
  }
}

async function persistSafely(options: PersistenceOptions, next: UserAgentMessageInput[]) {
  if (!options.conversationId) return;
  try {
    await options.persist(options.conversationId, next);
  } catch (error) {
    const content = error instanceof Error ? error.message : '对话保存失败，请稍后重试。';
    appendMessage(options.setMessages, 'error', content);
  }
}

function appendMessage(setMessages: SetMessages, role: UserAgentMessage['role'], content: string) {
  setMessages((current) => [...current, { id: crypto.randomUUID(), role, content }]);
}
