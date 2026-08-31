import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReportPanel } from './ReportPanel';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('ReportPanel', () => {
  it('makes report reload the only actionable control while a ready report cannot be read', () => {
    const markup = renderToStaticMarkup(
      createElement(ReportPanel, {
        report: null,
        sessionStatus: 'report_ready',
        onRetry: () => undefined,
        sessionId: 'session-1',
        onStartInterviewReview: () => undefined,
      }),
    );

    expect(markup).toContain('重新加载本轮复盘');
    expect(markup).not.toContain('开始针对性复练');
  });

  it('disables the retry control and describes progress while the reload is in flight', () => {
    const markup = renderToStaticMarkup(
      createElement(ReportPanel, {
        report: null,
        sessionStatus: 'report_ready',
        onRetry: () => undefined,
        retrying: true,
      }),
    );

    expect(markup).toContain('disabled=""');
    expect(markup).toContain('正在重新加载复盘');
  });
});

describe('ReportPanel while generating', () => {
  it('keeps a status check entry and expected duration while the report is generating', () => {
    const markup = renderToStaticMarkup(
      createElement(ReportPanel, {
        report: null,
        sessionStatus: 'generating_report',
        onRetry: () => undefined,
      }),
    );

    expect(markup).toContain('AI 正在生成本轮复盘');
    expect(markup).toContain('通常需要 30–90 秒');
    expect(markup).toContain('重新检查生成状态');
  });

  it('tells a dropped connection apart from ongoing generation', () => {
    const markup = renderToStaticMarkup(
      createElement(ReportPanel, {
        report: null,
        sessionStatus: 'generating_report',
        connectionLost: true,
        onRetry: () => undefined,
      }),
    );

    expect(markup).toContain('连接已断开，复盘仍在生成');
    expect(markup).toContain('重新检查生成状态');
    expect(markup).not.toContain('页面会自动接收结果');
  });
});

describe('ReportPanel with report content', () => {
  it('rounds every score and marks the 100-point scale', () => {
    const markup = renderToStaticMarkup(createElement(ReportPanel, { report: report() }));

    expect(markup).toContain('总分 86 / 100');
    expect(markup).toContain('/ 100');
    expect(markup).toContain('>59<');
    expect(markup).toContain('为什么是 59 分');
    expect(markup).not.toContain('86.4');
    expect(markup).not.toContain('58.6');
  });

  it('keeps exits visible when stage scores and next actions are missing', () => {
    const markup = renderToStaticMarkup(
      createElement(ReportPanel, { report: report({ stageScores: [], nextActions: [] }) }),
    );

    expect(markup).toContain('本轮未返回分项评分');
    expect(markup).toContain('前往复盘中心');
    expect(markup).toContain('href="/reports"');
    expect(markup).toContain('重新开始本轮');
  });
});

function report(overrides: Record<string, unknown> = {}) {
  return {
    overall: { score: 86.4, summary: '整体表现稳定。' },
    stageScores: [
      {
        stage: 'jd_core',
        score: 58.6,
        summary: '核心能力还需案例支撑。',
        evidence: ['缺少量化结果'],
      },
    ],
    nextActions: ['补充一个量化案例'],
    ...overrides,
  } as never;
}
