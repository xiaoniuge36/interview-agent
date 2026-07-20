import { describe, expect, it } from 'vitest';
import {
  filterAdminAgentConversations,
  formatConversationTime,
} from './admin-agent-conversation-model';

const conversations = [
  {
    id: 'one',
    title: '题库审核',
    messageCount: 4,
    lastMessagePreview: '还有 3 道待审核',
    createdAt: '2026-07-20T08:00:00.000Z',
    updatedAt: '2026-07-20T09:00:00.000Z',
  },
  {
    id: 'two',
    title: '运行观测',
    messageCount: 2,
    lastMessagePreview: '检查失败记录',
    createdAt: '2026-07-20T07:00:00.000Z',
    updatedAt: '2026-07-20T08:00:00.000Z',
  },
];

describe('admin agent conversation model', () => {
  it('filters by title or latest message preview without changing server order', () => {
    expect(filterAdminAgentConversations(conversations, '  待审核 ')).toEqual([conversations[0]]);
    expect(filterAdminAgentConversations(conversations, '')).toEqual(conversations);
  });

  it('formats recent conversation timestamps for the history rail', () => {
    expect(
      formatConversationTime('2026-07-20T09:00:00.000Z', new Date('2026-07-20T09:00:30.000Z')),
    ).toBe('刚刚');
  });
});
