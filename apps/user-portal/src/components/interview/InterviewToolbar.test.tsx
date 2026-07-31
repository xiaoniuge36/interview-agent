import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { InterviewController } from '@/hooks/useInterviewController';
import { nextInterviewRestartFocus } from './InterviewStartControl';
import { InterviewToolbar } from './InterviewToolbar';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('InterviewToolbar', () => {
  it('returns from settings to the active interview session', () => {
    const markup = render(
      controller({
        restoredSessionId: 'restored-session',
        state: { busy: false, session: { id: 'active-session' } },
      }),
    );

    expect(markup).toContain('href="/settings?returnTo=%2Finterview%3Fsession%3Dactive-session"');
    expect(markup).toContain('aria-haspopup="dialog"');
    expect(markup).toContain('class="button secondary"');
  });

  it('uses the restored session before its snapshot has loaded', () => {
    const markup = render(controller({ restoredSessionId: 'restored-session' }));

    expect(markup).toContain('href="/settings?returnTo=%2Finterview%3Fsession%3Drestored-session"');
  });

  it('keeps the direct settings fallback without a session', () => {
    const markup = render(controller());

    expect(markup).toContain('href="/settings"');
    expect(markup).not.toContain('aria-haspopup="dialog"');
  });

  it(
    'removes the restart CTA while a report-ready session is recovering its unreadable report',
    expectsRecoveryCtaOnly,
  );

  it('restores the restart CTA after the report is available again', expectsRestartAfterRecovery);

  it('cycles focus between keeping and restarting the interview', () => {
    expect(nextInterviewRestartFocus('cancel')).toBe('confirm');
    expect(nextInterviewRestartFocus('confirm')).toBe('cancel');
  });
});

function expectsRecoveryCtaOnly() {
  const markup = render(
    controller({
      restoredSessionId: 'report-session',
      state: {
        busy: false,
        report: null,
        session: { id: 'report-session', status: 'report_ready' },
      },
    }),
    true,
  );

  expect(markup).not.toContain('重新开始本轮');
  expect(markup).not.toContain('开始模拟面试');
}

function expectsRestartAfterRecovery() {
  const markup = render(
    controller({
      restoredSessionId: 'report-session',
      state: {
        busy: false,
        report: { id: 'report-1' },
        session: { id: 'report-session', status: 'report_ready' },
      },
    }),
  );

  expect(markup).toContain('重新开始本轮');
}

function render(value: InterviewController, reportRecoveryRequired = false) {
  return renderToStaticMarkup(
    createElement(InterviewToolbar, { jobs: [], controller: value, reportRecoveryRequired }),
  );
}

function controller(overrides: Record<string, unknown> = {}) {
  return {
    archivedLoadFailed: false,
    reloadArchivedInterview: () => undefined,
    restoredSessionId: null,
    selectedJobId: '',
    setSelectedJobId: () => undefined,
    start: async () => undefined,
    state: { busy: false, session: null },
    ...overrides,
  } as unknown as InterviewController;
}
