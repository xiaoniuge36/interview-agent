import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const { RuntimeEventList } = await import('./RuntimeEventList');
const { ReportPanel } = await import('./ReportPanel');

describe('interview sidebar', () => {
  it('labels the current AI operation and the persisted interview basis', () => {
    const markup = renderToStaticMarkup(
      createElement(RuntimeEventList, {
        events: [],
        phase: 'analyzing',
        basisSummary: ['基于你刚才的项目经历继续追问。'],
        sourceCount: 2,
      }),
    );

    expect(markup).toContain('AI 当前处理');
    expect(markup).toContain('本轮关注依据');
    expect(markup).toContain('本轮参考来源');
    expect(markup).toContain('已使用 2 条受控知识来源');
  });

  it('names the report next actions and retains the empty report guidance', () => {
    const reportMarkup = renderToStaticMarkup(createElement(ReportPanel, { report: report() }));
    const emptyMarkup = renderToStaticMarkup(createElement(ReportPanel, { report: null }));

    expect(reportMarkup).toContain('下一步建议');
    expect(emptyMarkup).toContain('完成一场模拟面试后');
  });

  it('explains when a completed report is temporarily unreadable', () => {
    const markup = renderToStaticMarkup(
      createElement(ReportPanel, {
        report: null,
        sessionStatus: 'report_ready',
        onRetry: () => undefined,
      } as never),
    );

    expect(markup).toContain('报告内容暂时无法读取');
    expect(markup).toContain('重新加载本轮复盘');
  });

  it('disables report retry while the archived snapshot is reloading', () => {
    const markup = renderToStaticMarkup(
      createElement(ReportPanel, {
        report: null,
        sessionStatus: 'report_ready',
        onRetry: () => undefined,
        retrying: true,
      } as never),
    );

    expect(markup).toContain('disabled=""');
    expect(markup).toContain('正在重新加载复盘…');
  });
});

describe('interview report status bridge', () => {
  it('explains report generation and keeps a same-session status check', () => {
    const markup = renderToStaticMarkup(
      createElement(ReportPanel, {
        report: null,
        sessionStatus: 'generating_report',
        onRetry: () => undefined,
      } as never),
    );

    expect(markup).toContain('AI 正在生成本轮复盘');
    expect(markup).toContain('刷新后仍会恢复同一轮');
    expect(markup).toContain('重新检查生成状态');
    expect(markup).not.toContain('完成一场模拟面试后');
  });

  it('preserves failed transcript context before offering a restart', () => {
    const markup = renderToStaticMarkup(
      createElement(ReportPanel, {
        report: null,
        sessionStatus: 'failed',
        onRetry: () => undefined,
      } as never),
    );

    expect(markup).toContain('本轮复盘未完成');
    expect(markup).toContain('已保存的面试对话不会丢失');
    expect(markup).toContain('重新检查本轮状态');
    expect(markup).not.toContain('完成一场模拟面试后');
  });
});

it('explains each stage score with persisted diagnosis and evidence', () => {
  const markup = renderToStaticMarkup(createElement(ReportPanel, { report: report() }));

  expect(markup).toContain('阶段诊断');
  expect(markup).toContain('为什么是 83 分');
  expect(markup).toContain('方案完整，但恢复验证还可加强。');
  expect(markup).toContain('缺少故障演练结果');
  expect(markup).toContain('id="interview-report"');
  expect(markup).toContain('tabindex="-1"');
});

function report() {
  return {
    overall: { score: 83, summary: '回答能说明关键取舍。' },
    stageScores: [
      {
        stage: 'project_deep_dive',
        score: 83,
        summary: '方案完整，但恢复验证还可加强。',
        evidence: ['缺少故障演练结果'],
      },
    ],
    nextActions: ['补充方案验证细节'],
  } as never;
}
