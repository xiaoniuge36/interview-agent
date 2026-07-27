import type { PageAgentCore } from '@page-agent/core';
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import type { AdminAgentMessageInput } from '@/lib/admin-page-agent-conversation-api';
import type { AdminPageAgentConfig } from '@/lib/admin-page-agent-api';
import {
  resolveAdminAgentRunCompletion,
  sanitizeAdminAgentRunErrorSummary,
} from './admin-agent-run-recovery-model';
import type { AdminAgentRunLifecycle } from './useAdminAgentRunRecovery';

type ConversationMessage = { id: string; role: 'user' | 'assistant' | 'error'; content: string };

export type AgentMessage = {
  id: string;
  role: 'user' | 'assistant' | 'activity' | 'error';
  content: string;
};
const MAX_MESSAGE_LENGTH = 4_000;
const EMPTY_CONVERSATION_MESSAGES: readonly ConversationMessage[] = [];

type ConversationOptions = {
  conversationId: string | null;
  initialMessages: readonly ConversationMessage[];
  persistMessages: (conversationId: string, messages: AdminAgentMessageInput[]) => Promise<unknown>;
  runLifecycle?: AdminAgentRunLifecycle;
};

export function useAdminAgentConversation(
  agentRef: MutableRefObject<PageAgentCore | null>,
  config: AdminPageAgentConfig | null,
  options?: ConversationOptions,
) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const pendingAnswer = useRef<((value: string) => void) | null>(null);
  const stopRequested = useRef(false);
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
  const actions = useConversationActions({
    agentRef,
    configMessage: config?.message,
    conversationId,
    persistMessages,
    runLifecycle: options?.runLifecycle,
    setMessages,
    stopRequested,
  });
  return {
    messages,
    pendingQuestion,
    askUser: question.askUser,
    answerQuestion: question.answerQuestion,
    ...actions,
  };
}

function useConversationActions(options: {
  agentRef: MutableRefObject<PageAgentCore | null>;
  configMessage: string | null | undefined;
  conversationId: string | null;
  persistMessages: ConversationOptions['persistMessages'] | undefined;
  runLifecycle: AdminAgentRunLifecycle | undefined;
  setMessages: SubmitContext['setMessages'];
  stopRequested: MutableRefObject<boolean>;
}) {
  const submit = useCallback(
    (value: string, retryOfRunId?: string) =>
      executeConversationTask({
        value,
        agent: options.agentRef.current,
        configMessage: options.configMessage,
        conversationId: options.conversationId,
        persistMessages: options.persistMessages,
        ...(options.runLifecycle ? { runLifecycle: options.runLifecycle } : {}),
        ...(retryOfRunId ? { retryOfRunId } : {}),
        stopRequested: options.stopRequested,
        setMessages: options.setMessages,
      }),
    [options],
  );
  const retry = useCallback((value: string, runId?: string) => submit(value, runId), [submit]);
  const stop = useCallback(() => {
    options.stopRequested.current = true;
    void options.agentRef.current?.stop();
  }, [options]);
  return { submit, retry, stop };
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

type SubmitContext = {
  value: string;
  agent: PageAgentCore | null;
  configMessage: string | null | undefined;
  conversationId: string | null;
  setMessages: (update: (current: AgentMessage[]) => AgentMessage[]) => void;
  persistMessages:
    ((conversationId: string, messages: AdminAgentMessageInput[]) => Promise<unknown>) | undefined;
  retryOfRunId?: string;
  runLifecycle?: AdminAgentRunLifecycle;
  stopRequested: MutableRefObject<boolean>;
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
  const persisted = await persistTaskMessage(context, [{ role: 'user', content: task }]);
  if (!persisted) return;
  const runId = await createTrackedRun(context, task);
  if (context.runLifecycle && !runId) return;
  context.stopRequested.current = false;
  await executeTrackedTask(context, task, runId);
}

async function createTrackedRun(context: SubmitContext, task: string) {
  if (!context.runLifecycle) return null;
  try {
    return (await context.runLifecycle.startRun(task, context.retryOfRunId)).id;
  } catch (error) {
    const content = error instanceof Error ? error.message : '无法创建运行记录，任务未执行。';
    context.setMessages((current) => [...current, message('error', content)]);
    void persistTaskMessage(context, [{ role: 'error', content }]);
    return null;
  }
}

async function executeTrackedTask(context: SubmitContext, task: string, runId: string | null) {
  try {
    const result = await context.agent!.execute(task);
    const status = resolveAdminAgentRunCompletion(result.success, context.stopRequested.current);
    const role = result.success ? 'assistant' : 'error';
    const content = result.data || '执行未完成，请查看执行过程。';
    context.setMessages((current) => [...current, message(role, content)]);
    await completeTrackedRun({ context, runId, status, summary: content });
    void persistTaskMessage(context, [{ role, content }]);
  } catch (error) {
    await handleTrackedError(context, runId, error);
  } finally {
    context.stopRequested.current = false;
  }
}

async function handleTrackedError(context: SubmitContext, runId: string | null, error: unknown) {
  const content = error instanceof Error ? error.message : 'Agent 执行失败，请稍后重试。';
  const status = resolveAdminAgentRunCompletion(false, context.stopRequested.current);
  context.setMessages((current) => [...current, message('error', content)]);
  await completeTrackedRun({ context, runId, status, summary: content });
  void persistTaskMessage(context, [{ role: 'error', content }]);
}

async function completeTrackedRun(input: {
  context: SubmitContext;
  runId: string | null;
  status: 'succeeded' | 'failed' | 'cancelled';
  summary: string;
}) {
  const { context, runId, status, summary } = input;
  if (!context.runLifecycle || !runId) return;
  await context.runLifecycle.completeRun(runId, {
    status,
    ...(status === 'succeeded'
      ? {}
      : { errorCode: status === 'cancelled' ? 'AGENT_CANCELLED' : 'AGENT_EXECUTION_FAILED' }),
    ...(status === 'succeeded' ? {} : { errorSummary: sanitizeAdminAgentRunErrorSummary(summary) }),
  });
}

async function persistTaskMessage(context: SubmitContext, next: AdminAgentMessageInput[]) {
  if (!context.persistMessages || !context.conversationId) return true;
  try {
    await context.persistMessages(context.conversationId, next);
    return true;
  } catch (error) {
    const content = error instanceof Error ? error.message : '对话保存失败，请稍后重试。';
    context.setMessages((current) => [...current, message('error', content)]);
    return false;
  }
}

function message(role: AgentMessage['role'], content: string): AgentMessage {
  return { id: crypto.randomUUID(), role, content };
}
