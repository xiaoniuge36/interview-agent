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
import type { UserAgentRun } from '@/lib/user-page-agent-run-api';
import type { UserPageAgentConfig } from '@/lib/user-page-agent-api';
import {
  createUserAgentTaskLifecycle,
  resolveUserAgentExecutionMessage,
  shouldPublishUserAgentExecutionMessage,
} from './conversation-execution';
import { isCurrentConversationEffect } from './conversation-execution-scope';
import { createPendingAnswerManager } from './conversation-question';
import { resolveUserAgentRunCompletion } from './user-agent-run-recovery-model';
import type { UserAgentRunLifecycle } from './useUserAgentRunRecovery';

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
  runLifecycle: UserAgentRunLifecycle;
};
type SubmitOptions = {
  agentRef: MutableRefObject<PageAgentCore | null>;
  configMessage: string | null | undefined;
  conversationId: string | null;
  isConversationCurrent: () => boolean;
  persist: ConversationOptions['persistMessages'];
  setMessages: SetMessages;
  taskLifecycle: TaskLifecycle;
  runLifecycle: UserAgentRunLifecycle;
};
type PersistenceOptions = Pick<SubmitOptions, 'conversationId' | 'persist' | 'setMessages'> & {
  isConversationCurrent: () => boolean;
  isCurrent: () => boolean;
};
type AgentExecutionOptions = PersistenceOptions & {
  task: string;
  runId: string;
  runLifecycle: UserAgentRunLifecycle;
};
type RunStartOptions = Pick<AgentExecutionOptions, 'task' | 'runLifecycle'> & {
  persistence: PersistenceOptions;
  retryOfRunId?: string;
};
type TaskLifecycle = ReturnType<typeof createUserAgentTaskLifecycle>;
const MAX_MESSAGE_LENGTH = 4_000;

export function useUserAgentConversation(
  agentRef: MutableRefObject<PageAgentCore | null>,
  config: UserPageAgentConfig | null,
  options: ConversationOptions,
) {
  const [messages, setMessages] = useState<UserAgentMessage[]>([]);
  const currentConversationId = useRef(options.conversationId);
  currentConversationId.current = options.conversationId;
  const isConversationCurrent = useCallback(
    () => isCurrentConversationEffect(currentConversationId.current, options.conversationId),
    [options.conversationId],
  );
  const [taskLifecycle] = useState(createUserAgentTaskLifecycle);
  useConversationReset(options, setMessages);
  const question = useUserQuestion(setMessages, options.conversationId, options.runLifecycle);
  const submit = useConversationSubmit({
    agentRef,
    configMessage: config?.message,
    conversationId: options.conversationId,
    isConversationCurrent,
    persist: options.persistMessages,
    setMessages,
    taskLifecycle,
    runLifecycle: options.runLifecycle,
  });
  const stop = useCallback(() => {
    taskLifecycle.cancel();
    void options.runLifecycle.cancelActiveRun();
    void agentRef.current?.stop();
  }, [agentRef, options.runLifecycle, taskLifecycle]);
  return { messages, ...question, submit, stop };
}

function useConversationReset(options: ConversationOptions, setMessages: SetMessages) {
  useEffect(() => {
    setMessages(options.initialMessages.map((item) => ({ ...item })));
  }, [options.conversationId, options.initialMessages, setMessages]);
}

function useUserQuestion(
  setMessages: SetMessages,
  conversationId: string | null,
  runLifecycle: UserAgentRunLifecycle,
) {
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [answerManager] = useState(() => createPendingAnswerManager(setPendingQuestion));
  useEffect(
    () => () => answerManager.cancel(new Error('对话已切换。')),
    [answerManager, conversationId],
  );
  const askUser = useCallback(
    (question: string, options?: { signal: AbortSignal }) => {
      void runLifecycle.markWaiting(question);
      appendMessage(setMessages, 'activity', `需要你的确认：${question}`);
      return answerManager.ask(question, options);
    },
    [answerManager, runLifecycle, setMessages],
  );
  const answerQuestion = useCallback(
    (answer: string) => {
      void runLifecycle.markRunning();
      answerManager.answer(answer);
    },
    [answerManager, runLifecycle],
  );
  return { pendingQuestion, askUser, answerQuestion };
}

function useConversationSubmit(options: SubmitOptions) {
  const { agentRef, configMessage, conversationId, isConversationCurrent, persist } = options;
  const { setMessages, taskLifecycle, runLifecycle } = options;
  return useCallback(
    (value: string, retryOfRunId?: string) =>
      submitConversationTask(
        {
          agentRef,
          configMessage,
          conversationId,
          isConversationCurrent,
          persist,
          setMessages,
          taskLifecycle,
          runLifecycle,
        },
        value,
        retryOfRunId,
      ),
    [
      agentRef,
      configMessage,
      conversationId,
      isConversationCurrent,
      persist,
      setMessages,
      taskLifecycle,
      runLifecycle,
    ],
  );
}

export function submitConversationTask(
  options: SubmitOptions,
  value: string,
  retryOfRunId?: string,
) {
  const { agentRef, configMessage, conversationId, isConversationCurrent, persist } = options;
  const { setMessages, taskLifecycle, runLifecycle } = options;
  return taskLifecycle.runExclusive(conversationId, async () => {
    const task = value.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!task) return;
    const taskToken = taskLifecycle.begin();
    const isCurrentTask = () => isConversationCurrent() && taskLifecycle.isCurrent(taskToken);
    appendMessage(setMessages, 'user', task);
    const agent = agentRef.current;
    if (!agent) {
      appendMessage(setMessages, 'error', configMessage ?? '请先连接一个可用模型。');
      return;
    }
    const persistence = {
      conversationId,
      isConversationCurrent,
      isCurrent: isCurrentTask,
      persist,
      setMessages,
    };
    const run = await startRunAfterPersistence({
      task,
      persistence,
      runLifecycle,
      ...(retryOfRunId ? { retryOfRunId } : {}),
    });
    if (!run) return;
    await executeAgentTask(agent, { ...persistence, task, runId: run.id, runLifecycle });
  });
}

async function startRunAfterPersistence(options: RunStartOptions): Promise<UserAgentRun | null> {
  const persisted = await persistSafely(options.persistence, [
    { role: 'user', content: options.task },
  ]);
  if (!persisted || !options.persistence.isCurrent()) return null;
  let run: UserAgentRun;
  try {
    run = await options.runLifecycle.startRun(options.task, options.retryOfRunId);
  } catch {
    return null;
  }
  if (options.persistence.isCurrent()) return run;
  await options.runLifecycle.completeRun(run.id, {
    status: 'cancelled',
    errorCode: 'TASK_CANCELLED',
    errorSummary: '任务已取消，未执行。',
  });
  return null;
}

async function executeAgentTask(agent: PageAgentCore, options: AgentExecutionOptions) {
  const { runId, runLifecycle, task } = options;
  try {
    const result = await agent.execute(task);
    const message = resolveUserAgentExecutionMessage(result, agent.status);
    await runLifecycle.completeRun(runId, {
      status: resolveUserAgentRunCompletion(result.success, agent.status === 'stopped'),
      currentStep: message.content,
    });
    if (
      shouldPublishUserAgentExecutionMessage(
        message,
        options.isConversationCurrent(),
        options.isCurrent(),
      )
    ) {
      appendMessage(options.setMessages, message.role, message.content);
    }
    if (message.persist)
      void persistSafely(options, [{ role: message.role, content: message.content }]);
  } catch (error) {
    if (!options.isCurrent()) return;
    await runLifecycle.completeRun(runId, {
      status: 'failed',
      errorCode: 'AGENT_EXECUTION_FAILED',
      errorSummary: error instanceof Error ? error.message : 'Agent execution failed',
    });
    const content = error instanceof Error ? error.message : '刷题教练执行失败，请稍后重试。';
    appendMessage(options.setMessages, 'error', content);
    void persistSafely(options, [{ role: 'error', content }]);
  }
}

async function persistSafely(options: PersistenceOptions, next: UserAgentMessageInput[]) {
  if (!options.conversationId) return false;
  try {
    await options.persist(options.conversationId, next);
    return true;
  } catch (error) {
    if (!options.isCurrent()) return false;
    const content = error instanceof Error ? error.message : '对话保存失败，请稍后重试。';
    appendMessage(options.setMessages, 'error', content);
    return false;
  }
}

function appendMessage(setMessages: SetMessages, role: UserAgentMessage['role'], content: string) {
  setMessages((current) => [...current, { id: crypto.randomUUID(), role, content }]);
}
