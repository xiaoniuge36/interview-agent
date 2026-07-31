import { describe, expect, it } from 'vitest';
import {
  createUserAgentDrawerCloseAction,
  createUserAgentTaskLifecycle,
  resolveUserAgentExecutionMessage,
  shouldPublishUserAgentExecutionMessage,
} from './conversation-execution';

function createDeferred() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('User Agent drawer close action', () => {
  it('stops the current task before closing the drawer', () => {
    const events: string[] = [];
    const close = createUserAgentDrawerCloseAction(
      () => events.push('stop'),
      () => events.push('close'),
    );

    close();

    expect(events).toEqual(['stop', 'close']);
  });
});

describe('User Agent task lifecycle', () => {
  it('invalidates a submitted task before it reaches execution', () => {
    const lifecycle = createUserAgentTaskLifecycle();
    const task = lifecycle.begin();

    lifecycle.cancel();

    expect(lifecycle.isCurrent(task)).toBe(false);
  });
});

describe('User Agent submission gate', () => {
  it('accepts only one submission for the same conversation while pending', async () => {
    const lifecycle = createUserAgentTaskLifecycle();
    const pending = createDeferred();

    const first = lifecycle.runExclusive('conversation-a', () => pending.promise);
    let duplicateStarted = false;
    const duplicate = await lifecycle.runExclusive('conversation-a', async () => {
      duplicateStarted = true;
    });

    expect(duplicate).toBe(false);
    expect(duplicateStarted).toBe(false);
    pending.resolve();
    await expect(first).resolves.toBe(true);
  });

  it('releases a conversation after a failed submission so it can retry', async () => {
    const lifecycle = createUserAgentTaskLifecycle();

    await expect(
      lifecycle.runExclusive('conversation-a', async () => {
        throw new Error('persistence failed');
      }),
    ).rejects.toThrow('persistence failed');
    await expect(lifecycle.runExclusive('conversation-a', async () => undefined)).resolves.toBe(
      true,
    );
  });

  it('allows a new conversation to submit while the previous conversation is pending', async () => {
    const lifecycle = createUserAgentTaskLifecycle();
    const pending = createDeferred();

    const previousConversation = lifecycle.runExclusive('conversation-a', () => pending.promise);
    let currentConversationStarted = false;
    const currentConversation = await lifecycle.runExclusive('conversation-b', async () => {
      currentConversationStarted = true;
    });

    expect(currentConversation).toBe(true);
    expect(currentConversationStarted).toBe(true);
    pending.resolve();
    await expect(previousConversation).resolves.toBe(true);
  });
});

describe('User Agent execution result message', () => {
  it('shows a stopped task as local activity instead of a persisted error', () => {
    const message = resolveUserAgentExecutionMessage(
      { success: false, data: 'Task aborted' },
      'stopped',
    );

    expect(message).toEqual({ role: 'activity', content: '已停止本次请求。', persist: false });
    expect(shouldPublishUserAgentExecutionMessage(message, true, false)).toBe(true);
  });

  it('suppresses a stale error even when the conversation is still active', () => {
    const message = resolveUserAgentExecutionMessage(
      { success: false, data: 'network down' },
      'error',
    );

    expect(shouldPublishUserAgentExecutionMessage(message, true, false)).toBe(false);
  });

  it('keeps a real execution failure as a persisted error', () => {
    const message = resolveUserAgentExecutionMessage(
      { success: false, data: 'network down' },
      'error',
    );

    expect(message).toEqual({ role: 'error', content: 'network down', persist: true });
    expect(shouldPublishUserAgentExecutionMessage(message, true, true)).toBe(true);
  });
});
