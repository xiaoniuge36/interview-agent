import { describe, expect, it } from 'vitest';
import { isCurrentConversationEffect } from './conversation-execution-scope';

describe('对话异步 effect scope', () => {
  it('来源与当前会话相同时允许 effect', () => {
    expect(isCurrentConversationEffect('conversation-a', 'conversation-a')).toBe(true);
  });

  it('来源与当前会话不同时拒绝 effect', () => {
    expect(isCurrentConversationEffect('conversation-b', 'conversation-a')).toBe(false);
  });

  it('任一 id 为空时拒绝 effect', () => {
    expect(isCurrentConversationEffect(null, 'conversation-a')).toBe(false);
    expect(isCurrentConversationEffect('conversation-a', null)).toBe(false);
    expect(isCurrentConversationEffect(null, null)).toBe(false);
  });
});
