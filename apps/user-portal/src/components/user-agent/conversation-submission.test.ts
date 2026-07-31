import type { PageAgentCore } from '@page-agent/core';
import { expect, it, vi } from 'vitest';
import type { UserAgentMessageInput } from '@/lib/user-agent-conversation-api';
import type { UserAgentRun } from '@/lib/user-page-agent-run-api';
import { createUserAgentTaskLifecycle } from './conversation-execution';
import { submitConversationTask } from './useUserAgentConversation';
import type { UserAgentRunLifecycle } from './useUserAgentRunRecovery';

type SubmitOptions = Parameters<typeof submitConversationTask>[0];

function createDeferred() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function createHarness(options: {
  conversationId: string;
  isConversationCurrent: () => boolean;
  persist: SubmitOptions['persist'];
  taskLifecycle: ReturnType<typeof createUserAgentTaskLifecycle>;
}) {
  const execute = vi.fn(async () => ({ success: false, data: 'stopped' }));
  const startRun = vi.fn<UserAgentRunLifecycle['startRun']>(async () =>
    createRun(options.conversationId),
  );
  const runLifecycle: UserAgentRunLifecycle = {
    startRun,
    completeRun: vi.fn(async () => undefined),
    cancelActiveRun: vi.fn(async () => undefined),
    reportProgress: vi.fn(),
    markWaiting: vi.fn(async () => undefined),
    markRunning: vi.fn(async () => undefined),
  };
  const submitOptions = {
    agentRef: { current: { execute, status: 'stopped' } as unknown as PageAgentCore },
    configMessage: null,
    conversationId: options.conversationId,
    isConversationCurrent: options.isConversationCurrent,
    persist: options.persist,
    setMessages: vi.fn(),
    taskLifecycle: options.taskLifecycle,
    runLifecycle,
  } as SubmitOptions;
  return { execute, runLifecycle, startRun, submitOptions };
}

function createRun(conversationId: string): UserAgentRun {
  return {
    id: `run-${conversationId}`,
    conversationId,
    retryOfRunId: null,
    prompt: '训练任务',
    status: 'running',
    currentStep: null,
    tokenCount: 0,
    traceId: `trace-${conversationId}`,
    errorCode: null,
    errorSummary: null,
    startedAt: '2026-07-30T00:00:00.000Z',
    finishedAt: null,
    heartbeatAt: '2026-07-30T00:00:00.000Z',
    updatedAt: '2026-07-30T00:00:00.000Z',
  };
}

function createSubmit(options: SubmitOptions) {
  return (value: string) => submitConversationTask(options, value);
}

it('wires the conversation scope through slow persistence and starts one run for a double submit', async () => {
  const pending = createDeferred();
  const persist = vi.fn(async () => pending.promise);
  const harness = createHarness({
    conversationId: 'conversation-a',
    isConversationCurrent: () => true,
    persist,
    taskLifecycle: createUserAgentTaskLifecycle(),
  });
  const submit = createSubmit(harness.submitOptions);

  const first = submit('分析当前训练状态');
  const duplicate = await submit('分析当前训练状态');

  expect(persist).toHaveBeenCalledTimes(1);
  expect(duplicate).toBe(false);
  pending.resolve();
  await expect(first).resolves.toBe(true);
  expect(harness.startRun).toHaveBeenCalledTimes(1);
  expect(harness.execute).toHaveBeenCalledTimes(1);
});

it('releases the submission gate after persistence fails so the conversation can retry', async () => {
  let attempt = 0;
  const persist = vi.fn(async () => {
    attempt += 1;
    if (attempt === 1) throw new Error('persistence failed');
    return {};
  });
  const harness = createHarness({
    conversationId: 'conversation-a',
    isConversationCurrent: () => true,
    persist,
    taskLifecycle: createUserAgentTaskLifecycle(),
  });
  const submit = createSubmit(harness.submitOptions);

  await expect(submit('第一次')).resolves.toBe(true);
  await expect(submit('再次重试')).resolves.toBe(true);

  expect(persist).toHaveBeenCalledTimes(2);
  expect(harness.startRun).toHaveBeenCalledTimes(1);
  expect(harness.execute).toHaveBeenCalledTimes(1);
});

it('lets a new conversation run while stale persistence finishes without crossing writes', async () => {
  const pending = createDeferred();
  const writes: Array<{ conversationId: string; content: string }> = [];
  const persist = vi.fn(async (conversationId: string, messages: UserAgentMessageInput[]) => {
    writes.push({ conversationId, content: messages[0]?.content ?? '' });
    if (conversationId === 'conversation-a') await pending.promise;
    return {};
  });
  let currentConversation = 'conversation-a';
  const taskLifecycle = createUserAgentTaskLifecycle();
  const first = createHarness({
    conversationId: 'conversation-a',
    isConversationCurrent: () => currentConversation === 'conversation-a',
    persist,
    taskLifecycle,
  });
  const second = createHarness({
    conversationId: 'conversation-b',
    isConversationCurrent: () => currentConversation === 'conversation-b',
    persist,
    taskLifecycle,
  });

  const staleSubmission = submitConversationTask(first.submitOptions, '旧对话任务');
  currentConversation = 'conversation-b';
  await submitConversationTask(second.submitOptions, '新对话任务');
  pending.resolve();
  await staleSubmission;

  expect(writes).toEqual([
    { conversationId: 'conversation-a', content: '旧对话任务' },
    { conversationId: 'conversation-b', content: '新对话任务' },
  ]);
  expect(first.startRun).not.toHaveBeenCalled();
  expect(first.execute).not.toHaveBeenCalled();
  expect(second.startRun).toHaveBeenCalledTimes(1);
  expect(second.execute).toHaveBeenCalledTimes(1);
});
