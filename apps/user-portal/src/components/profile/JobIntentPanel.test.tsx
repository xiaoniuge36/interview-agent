import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const { JobIntentPanel } = await import('./JobIntentPanel');

describe('JobIntentPanel', () => {
  it('keeps save and save-and-start together while emphasizing the training handoff', () => {
    const markup = render();

    expect(markup).toMatch(
      /<button[^>]*type="submit"[^>]*name="job-submit-action"[^>]*value="save"/,
    );
    expect(markup).toContain('仅保存');
    expect(markup).toMatch(
      /<button[^>]*type="submit"[^>]*name="job-submit-action"[^>]*value="save_and_start"/,
    );
    expect(markup).toContain('保存并开始模拟面试');
    expect(markup).toContain('class="button job-start-button"');
    expect(markup).toContain('id="job-status"');
  });

  it('renders first use without a preselected role or synthetic JD', () => {
    const markup = render();

    expect(markup).toMatch(/id="job-target-role"[^>]*value=""/);
    expect(markup).toMatch(/id="job-description"[^>]*><\/textarea>/);
    expect(markup).not.toContain('role-chip active');
    expect(markup).toContain('系统不会替你假定岗位');
  });
});

function render() {
  return renderToStaticMarkup(
    createElement(
      NotificationProvider,
      null,
      createElement(JobIntentPanel, {
        onCreated: vi.fn(),
        onStart: vi.fn(),
      }),
    ),
  );
}
