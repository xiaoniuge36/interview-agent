import { CONTRACT_LIMITS } from '@interview-agent/contracts';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const { AnswerComposer, isAnswerSubmitShortcut } = await import('./AnswerComposer');

describe('AnswerComposer', () => {
  it('shows the answer structure prompt and character count', () => {
    const markup = render('');

    expect(markup).toContain('回答结构提示');
    expect(markup).toContain(`0 / ${CONTRACT_LIMITS.longText.toLocaleString()}`);
    expect(markup).toContain('提交回答并继续');
  });

  it('uses one STAR wording in both the guidance and the structure prompt', () => {
    const markup = render('');

    expect(markup).toContain('背景、任务、行动、结果（STAR）');
    expect(markup).not.toContain('背景、行动、判断、结果');
    expect(markup).not.toContain('个人贡献、关键判断和可验证结果');
  });

  it('announces the Ctrl/⌘ + Enter submit shortcut next to the answer box', () => {
    const markup = render('');

    expect(markup).toContain('Ctrl/⌘ + Enter 提交');
  });

  it('recognizes only Ctrl/⌘ + Enter as the submit shortcut', () => {
    expect(isAnswerSubmitShortcut({ key: 'Enter', ctrlKey: true, metaKey: false })).toBe(true);
    expect(isAnswerSubmitShortcut({ key: 'Enter', ctrlKey: false, metaKey: true })).toBe(true);
    expect(isAnswerSubmitShortcut({ key: 'Enter', ctrlKey: false, metaKey: false })).toBe(false);
    expect(isAnswerSubmitShortcut({ key: 'a', ctrlKey: true, metaKey: false })).toBe(false);
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
});

describe('AnswerComposer completion card', () => {
  it('replaces the form with a completion summary after the report is loaded', () => {
    const markup = renderCompleted({ id: 'report-1' });

    expect(markup).toContain('本轮已结束');
    expect(markup).toContain('共回答 2 题，复盘已生成');
    expect(markup).not.toContain('正在读取详情');
    expect(markup).toContain('href="#interview-report"');
    expect(markup).toContain('查看本轮复盘');
    expect(markup).toContain('href="/reports"');
    expect(markup).toContain('前往复盘中心');
    expect(markup).not.toContain('提交回答并继续');
  });

  it('does not claim the report is readable before it has been fetched', () => {
    const markup = renderCompleted(null);

    expect(markup).toContain('共回答 2 题，复盘已生成，正在读取详情…');
    expect(markup).toContain('「本轮复盘」面板');
    expect(markup).toContain('href="#interview-report"');
  });
});

function renderCompleted(report: { id: string } | null) {
  return renderToStaticMarkup(
    createElement(AnswerComposer, {
      controller: {
        canAnswer: false,
        draftRecovered: false,
        state: {
          busy: false,
          draft: '',
          notice: '',
          report,
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
}

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
