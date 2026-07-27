import { describe, expect, it } from 'vitest';
import {
  createUserAgentDrawerCloseAction,
  createUserAgentTaskLifecycle,
  resolveUserAgentExecutionMessage,
  shouldPublishUserAgentExecutionMessage,
} from './conversation-execution';

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

describe('User Agent execution result message', () => {
  it('invalidates a submitted task before it reaches execution', () => {
    const lifecycle = createUserAgentTaskLifecycle();
    const task = lifecycle.begin();

    lifecycle.cancel();

    expect(lifecycle.isCurrent(task)).toBe(false);
  });

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
