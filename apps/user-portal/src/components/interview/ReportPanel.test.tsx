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
