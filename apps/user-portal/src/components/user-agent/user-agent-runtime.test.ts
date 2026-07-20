import { describe, expect, it } from 'vitest';
import { formatUserAgentConversationContext } from './user-agent-runtime';

describe('formatUserAgentConversationContext', () => {
  it('keeps only recent user and assistant messages within the context budget', () => {
    const messages = [
      { role: 'error' as const, content: 'ignore me' },
      { role: 'user' as const, content: '第一条' },
      { role: 'assistant' as const, content: '第二条' },
    ];

    expect(formatUserAgentConversationContext(messages)).toBe('用户：第一条\n助手：第二条');
  });
});
