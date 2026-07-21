import { describe, expect, it } from 'vitest';
import { resolveAdminAgentPageContext } from './admin-agent-page-context';

describe('resolveAdminAgentPageContext', () => {
  it('uses a review-workbench context in the content view', () => {
    const context = resolveAdminAgentPageContext('content', 'admin');

    expect(context.id).toBe('review-workbench');
    expect(context.quickActions.map((action) => action.id)).toContain('review-queue');
    expect(context.runtimeInstructions).toContain('不执行审核、发布或批量处理');
  });

  it('uses observability actions in the runtime view', () => {
    expect(resolveAdminAgentPageContext('runtime', 'admin').quickActions.map((action) => action.id)).toContain(
      'runtime-failures',
    );
  });

  it('hides platform-only AI usage from non-platform administrators', () => {
    expect(resolveAdminAgentPageContext('analytics', 'admin').quickActions.map((action) => action.id)).not.toContain(
      'ai-usage',
    );
    expect(
      resolveAdminAgentPageContext('analytics', 'platform_admin').quickActions.map((action) => action.id),
    ).toContain('ai-usage');
  });
});
