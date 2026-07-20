import { describe, expect, it } from 'vitest';
import {
  createUserAgentConversationRequest,
  createUserAgentConversationsRequest,
  createAppendUserAgentMessagesRequest,
  createDeleteUserAgentConversationRequest,
  createRenameUserAgentConversationRequest,
} from './user-agent-conversation-api';

describe('user agent conversation API', () => {
  it('builds user-scoped conversation paths', () => {
    expect(createUserAgentConversationsRequest().path).toBe('/user/page-agent/conversations');
    expect(createUserAgentConversationRequest('conversation/1').path).toBe(
      '/user/page-agent/conversations/conversation%2F1',
    );
  });

  it('serializes rename, append and delete requests', () => {
    const rename = createRenameUserAgentConversationRequest('conversation-1', '今日训练');
    const append = createAppendUserAgentMessagesRequest('conversation-1', [
      { role: 'user', content: ' 查询我的薄弱项 ' },
    ]);

    expect(rename.init?.method).toBe('PATCH');
    expect(JSON.parse(String(rename.init?.body))).toEqual({ title: '今日训练' });
    expect(append.init?.method).toBe('POST');
    expect(JSON.parse(String(append.init?.body))).toEqual({
      messages: [{ role: 'user', content: ' 查询我的薄弱项 ' }],
    });
    expect(createDeleteUserAgentConversationRequest('conversation-1').init?.method).toBe('DELETE');
  });
});
