import { describe, expect, it } from 'vitest';
import type { UserAgentConversation } from '@/lib/user-agent-conversation-api';
import { reconcilePersistedConversation } from './conversation-persistence';

function conversation(id: string, content: string): UserAgentConversation {
  const timestamp = '2026-07-23T12:00:00.000Z';
  return {
    id,
    title: id,
    messageCount: 1,
    lastMessagePreview: content,
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [
      { id: `${id}-message`, role: 'assistant', content, tokenCount: 1, createdAt: timestamp },
    ],
  };
}

describe('持久化对话 reconciliation', () => {
  it('id 匹配时应用最新持久化结果', () => {
    const current = conversation('conversation-a', '旧内容');
    const persisted = conversation('conversation-a', '新内容');

    expect(reconcilePersistedConversation(current, persisted)).toBe(persisted);
  });

  it('id 不匹配时保留当前活动会话', () => {
    const current = conversation('conversation-b', '当前内容');
    const persisted = conversation('conversation-a', '旧请求结果');

    expect(reconcilePersistedConversation(current, persisted)).toBe(current);
  });

  it('没有活动会话时保持 null', () => {
    expect(reconcilePersistedConversation(null, conversation('conversation-a', '结果'))).toBeNull();
  });
});
