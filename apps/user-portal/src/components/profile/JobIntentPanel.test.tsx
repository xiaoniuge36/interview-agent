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
