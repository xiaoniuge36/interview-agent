import { CONTRACT_LIMITS } from '@interview-agent/contracts';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const { AnswerComposer } = await import('./AnswerComposer');

describe('AnswerComposer', () => {
  it('shows the answer structure prompt and character count', () => {
    const markup = render('');

    expect(markup).toContain('回答结构提示');
    expect(markup).toContain(`0 / ${CONTRACT_LIMITS.longText.toLocaleString()}`);
    expect(markup).toContain('提交回答并继续');
  });

  it('keeps the AI processing status next to the disabled submit action', () => {
    const markup = render('正在发送的回答', true);

    expect(markup).toContain('AI 面试官正在准备下一题');
    expect(markup).toMatch(/<button[^>]*disabled/);
  });

  it('shows when the current tab draft was restored', () => {
    const markup = render('已恢复回答', false, true);

    expect(markup).toContain('已恢复当前标签页草稿');
  });
});

function render(draft: string, busy = false, draftRecovered = false) {
  return renderToStaticMarkup(
    createElement(AnswerComposer, {
      controller: {
        canAnswer: !busy,
        draftRecovered,
        state: { busy, draft, notice: '回答会在提交后由服务端保存。' },
        setDraft: () => undefined,
        submitAnswer: () => Promise.resolve(),
      } as never,
    }),
  );
}
