import { describe, expect, it } from 'vitest';
import { parseAnswerBlocks } from './practice-answer-review-model';

describe('parseAnswerBlocks', () => {
  it('preserves headings, lists, quotes, and code as readable answer blocks', () => {
    const answer = [
      '# 防护策略',
      '',
      '先识别外部内容，再决定是否允许工具执行。',
      '',
      '- 最小权限',
      '- 工具白名单',
      '',
      '> 先验证来源，再执行操作。',
      '',
      '```ts',
      'allowlist(tool);',
      '```',
    ].join('\n');

    expect(parseAnswerBlocks(answer)).toEqual([
      { kind: 'heading', level: 1, text: '防护策略' },
      { kind: 'paragraph', text: '先识别外部内容，再决定是否允许工具执行。' },
      { kind: 'list', ordered: false, items: ['最小权限', '工具白名单'] },
      { kind: 'quote', text: '先验证来源，再执行操作。' },
      { kind: 'code', language: 'ts', text: 'allowlist(tool);' },
    ]);
  });

  it('keeps non-empty plain text readable and ignores empty answers', () => {
    expect(parseAnswerBlocks('一段没有 Markdown 的回答。')).toEqual([
      { kind: 'paragraph', text: '一段没有 Markdown 的回答。' },
    ]);
    expect(parseAnswerBlocks('   \n\n')).toEqual([]);
  });
});
