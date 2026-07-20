import { describe, expect, it } from 'vitest';
import {
  createAdminAgentConversationRequest,
  createAdminAgentConversationsRequest,
  createAppendAdminAgentMessagesRequest,
  createDeleteAdminAgentConversationRequest,
  createRenameAdminAgentConversationRequest,
} from './admin-page-agent-conversation-api';

describe('admin page agent conversation API requests', () => {
  it('lists conversations and loads one conversation with stable paths', () => {
    expect(createAdminAgentConversationsRequest().path).toBe('/admin/page-agent/conversations');
    expect(createAdminAgentConversationRequest('conversation/1').path).toBe(
      '/admin/page-agent/conversations/conversation%2F1',
    );
  });

  it('uses the conversation CRUD methods and serializes safe message fields', () => {
    const rename = createRenameAdminAgentConversationRequest('conversation-1', '题库治理');
    const append = createAppendAdminAgentMessagesRequest('conversation-1', [
      { role: 'user', content: ' 查询待审核导入 ' },
    ]);

    expect(rename.init?.method).toBe('PATCH');
    expect(JSON.parse(String(rename.init?.body))).toEqual({ title: '题库治理' });
    expect(append.init?.method).toBe('POST');
    expect(JSON.parse(String(append.init?.body))).toEqual({
      messages: [{ role: 'user', content: ' 查询待审核导入 ' }],
    });
    expect(createDeleteAdminAgentConversationRequest('conversation-1').init?.method).toBe('DELETE');
  });
});
