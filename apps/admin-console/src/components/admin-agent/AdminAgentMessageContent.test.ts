import { describe, expect, it } from 'vitest';
import { parseAdminAgentContent } from './AdminAgentMessageContent';

describe('admin agent message content', () => {
  it('turns a Markdown batch result into readable content blocks', () => {
    const blocks = parseAdminAgentContent(`已查询完成，当前有 **2 个导入批次** 待处理。

| 批次名称 | 候选题目数 | 待审核 |
|---|---:|---:|
| agent 最容易被追问的坑 | 8 | 6 |

**结论：** 仍有题目等待审核。

- 前往审核工作台
- 审核后再发布`);

    expect(blocks).toEqual([
      { kind: 'paragraph', text: '已查询完成，当前有 **2 个导入批次** 待处理。' },
      {
        kind: 'table',
        headers: ['批次名称', '候选题目数', '待审核'],
        rows: [['agent 最容易被追问的坑', '8', '6']],
      },
      { kind: 'section', title: '结论', text: '仍有题目等待审核。' },
      { kind: 'list', items: ['前往审核工作台', '审核后再发布'] },
    ]);
  });

  it('keeps the new plain-language response format structured', () => {
    expect(
      parseAdminAgentContent(
        '结果概览：发现 1 个导入批次待处理\n关键数据：\n- 待审核：6 道\n下一步：前往内容治理 → 审核工作台',
      ),
    ).toEqual([
      { kind: 'section', title: '结果概览', text: '发现 1 个导入批次待处理' },
      { kind: 'section', title: '关键数据', text: '' },
      { kind: 'list', items: ['待审核：6 道'] },
      { kind: 'section', title: '下一步', text: '前往内容治理 → 审核工作台' },
    ]);
  });
});
