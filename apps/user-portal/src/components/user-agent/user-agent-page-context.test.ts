import { describe, expect, it } from 'vitest';
import { resolveUserAgentPageContext } from './user-agent-page-context';

describe('resolveUserAgentPageContext', () => {
  it('uses practice guidance for an active practice route', () => {
    const context = resolveUserAgentPageContext('/practice/session-1');

    expect(context.id).toBe('practice');
    expect(context.quickActions.map((action) => action.id)).toContain('practice-guidance');
    expect(context.runtimeInstructions).toContain('不替用户保存或提交答案');
  });

  it('offers report-focused guidance in the review center', () => {
    const context = resolveUserAgentPageContext('/reports');

    expect(context.id).toBe('reports');
    expect(context.quickActions.map((action) => action.id)).toContain('review-weaknesses');
  });

  it('falls back to the general training context for unknown routes', () => {
    expect(resolveUserAgentPageContext('/unrecognized').id).toBe('training-overview');
  });
});
