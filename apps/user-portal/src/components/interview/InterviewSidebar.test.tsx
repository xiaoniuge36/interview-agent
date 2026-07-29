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

function report() {
  return {
    overall: { score: 83, summary: '回答能说明关键取舍。' },
    stageScores: [{ stage: 'project_deep_dive', score: 83 }],
    nextActions: ['补充方案验证细节'],
  } as never;
}
