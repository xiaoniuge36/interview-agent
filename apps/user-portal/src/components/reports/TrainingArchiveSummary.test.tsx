import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';
import { ArchiveSummary } from './ReportsPageContent';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('ArchiveSummary', () => {
  it('turns persisted training evidence into a weakness review action', () => {
    const markup = renderToStaticMarkup(
      createElement(
        NotificationProvider,
        null,
        createElement(ArchiveSummary, {
          summary: { total: 4, practice: 3, interview: 1, reviewed: 3 },
        }),
      ),
    );

    expect(markup).toContain('4 条记录已沉淀');
    expect(markup).toContain('复练薄弱项');
  });

  it('does not offer weakness review without practice evidence', () => {
    const markup = renderToStaticMarkup(
      createElement(
        NotificationProvider,
        null,
        createElement(ArchiveSummary, {
          summary: { total: 2, practice: 0, interview: 2, reviewed: 2 },
        }),
      ),
    );

    expect(markup).not.toContain('复练薄弱项');
  });
});
