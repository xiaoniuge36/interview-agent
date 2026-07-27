import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PracticeAnswerReview } from './PracticeAnswerReview';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('PracticeAnswerReview', () => {
  it('shows a readable preview and keeps the remaining answer behind an explicit control', () => {
    const markup = renderToStaticMarkup(
      createElement(PracticeAnswerReview, {
        answer: [
          '# 防护策略',
          '',
          '先识别外部内容。',
          '',
          '- 最小权限',
          '',
          '> 先验证来源。',
          '',
          '```ts',
          'allowlist(tool);',
          '```',
          '',
          '最后记录审计事件。',
        ].join('\n'),
        answerCurrent: true,
        tags: ['Agent', '安全'],
      }),
    );

    expect(markup).toContain('结构化阅读');
    expect(markup).toContain('已保存');
    expect(markup).toContain('6 个阅读块');
    expect(markup).toContain('展开剩余 2 段');
    expect(markup).toContain('防护策略');
    expect(markup).toContain('先验证来源。');
    expect(markup).not.toContain('allowlist(tool);');
  });
});
