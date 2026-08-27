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

  it('invites the user to start before any session exists', () => {
    const markup = render('');

    expect(markup).toContain('点击上方「开始模拟面试」，第一题会出现在这里。');
  });

  it('replaces the form with a completion summary after the report is ready', () => {
    const markup = renderToStaticMarkup(
      createElement(AnswerComposer, {
        controller: {
          canAnswer: false,
          draftRecovered: false,
          state: {
            busy: false,
            draft: '',
            notice: '',
            session: {
              status: 'report_ready',
              turns: [
                { id: 'turn-q', role: 'interviewer' },
                { id: 'turn-a', role: 'candidate' },
                { id: 'turn-a2', role: 'candidate' },
              ],
            },
          },
          setDraft: () => undefined,
          submitAnswer: () => Promise.resolve(),
        } as never,
      }),
    );

    expect(markup).toContain('本轮已结束');
    expect(markup).toContain('共回答 2 题，复盘已生成');
    expect(markup).toContain('href="#interview-report"');
    expect(markup).not.toContain('提交回答并继续');
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
