import { describe, expect, it } from 'vitest';
import { formatAdminAgentConversationContext } from './admin-agent-runtime';

describe('admin agent runtime conversation context', () => {
  it('keeps only readable user and assistant messages for a resumed conversation', () => {
    expect(
      formatAdminAgentConversationContext([
        { role: 'user', content: '查询待审核导入' },
        { role: 'assistant', content: '发现 2 个批次' },
        { role: 'error', content: '网络错误' },
      ]),
    ).toContain('用户：查询待审核导入\n助手：发现 2 个批次');
    expect(formatAdminAgentConversationContext([{ role: 'error', content: '只保留错误' }])).toBe(
      '',
    );
  });
});
