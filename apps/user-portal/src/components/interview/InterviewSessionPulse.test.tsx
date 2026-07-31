import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { InterviewSessionPulse } from './InterviewSessionPulse';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('InterviewSessionPulse', () => {
  it('shows only real answered turns, stage, and AI processing state', () => {
    const markup = renderToStaticMarkup(
      createElement(InterviewSessionPulse, {
        session: session(),
        phase: 'composing',
        statusLabel: '等待回答',
      }),
    );

    expect(markup).toContain('已回答 2 题');
    expect(markup).toContain('项目深挖');
    expect(markup).toContain('AI 正在组织下一题');
    expect(markup).not.toContain('预计完成时间');
  });

  it('describes a session that has not started', () => {
    const markup = renderToStaticMarkup(
      createElement(InterviewSessionPulse, {
        session: null,
        phase: null,
        statusLabel: '尚未开始',
      }),
    );

    expect(markup).toContain('已回答 0 题');
    expect(markup).toContain('准备开始');
    expect(markup).toContain('尚未开始');
  });

  it('offers a direct report jump only after the report is ready', () => {
    const readyMarkup = renderToStaticMarkup(
      createElement(InterviewSessionPulse, {
        session: {
          status: 'report_ready',
          stage: 'report_ready',
          turns: [{ role: 'interviewer' }, { role: 'candidate' }, { role: 'candidate' }],
        } as never,
        phase: null,
        statusLabel: '复盘已生成',
      }),
    );
    const activeMarkup = renderToStaticMarkup(
      createElement(InterviewSessionPulse, {
        session: session(),
        phase: null,
        statusLabel: '等待回答',
      }),
    );

    expect(readyMarkup).toContain('href="#interview-report"');
    expect(readyMarkup).toContain('直接查看本轮复盘');
    expect(activeMarkup).not.toContain('直接查看本轮复盘');
  });
});

function session() {
  return {
    status: 'waiting_user',
    stage: 'project_deep_dive',
    turns: [{ role: 'interviewer' }, { role: 'candidate' }, { role: 'candidate' }],
  } as never;
}
