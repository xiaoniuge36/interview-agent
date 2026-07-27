import type { AgentStatus } from '@page-agent/core';

type AgentExecutionResult = { success: boolean; data: string };
type UserAgentExecutionMessage =
  | { role: 'activity'; content: string; persist: false }
  | { role: 'assistant' | 'error'; content: string; persist: true };

const STOPPED_MESSAGE = '已停止本次请求。';
const EMPTY_RESULT_MESSAGE = '本次建议没有完成，请稍后重试。';

export function createUserAgentDrawerCloseAction(stop: () => void, close: () => void) {
  return () => {
    stop();
    close();
  };
}

export function createUserAgentTaskLifecycle() {
  let latest = 0;
  return {
    begin: () => ++latest,
    cancel: () => ++latest,
    isCurrent: (token: number) => token === latest,
  };
}

export function resolveUserAgentExecutionMessage(
  result: AgentExecutionResult,
  status: AgentStatus,
): UserAgentExecutionMessage {
  if (status === 'stopped') {
    return { role: 'activity', content: STOPPED_MESSAGE, persist: false };
  }
  return {
    role: result.success ? 'assistant' : 'error',
    content: result.data || EMPTY_RESULT_MESSAGE,
    persist: true,
  };
}

export function shouldPublishUserAgentExecutionMessage(
  message: UserAgentExecutionMessage,
  isConversationCurrent: boolean,
  isTaskCurrent: boolean,
) {
  return isConversationCurrent && (!message.persist || isTaskCurrent);
}
