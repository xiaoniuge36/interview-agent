import { describe, expect, it } from 'vitest';
import { adminAgentQuickActions } from './admin-agent-quick-actions';

describe('admin agent quick actions', () => {
  it('keeps the first-run shortcuts focused on safe operational queries', () => {
    expect(adminAgentQuickActions.map((action) => action.id)).toEqual([
      'pending-imports',
      'pending-candidates',
      'runtime-health',
      'dashboard',
    ]);
    expect(adminAgentQuickActions.every((action) => action.prompt.length > 0)).toBe(true);
  });

  it('does not advertise sensitive write operations as a one-click action', () => {
    const prompts = adminAgentQuickActions.map((action) => action.prompt).join(' ');

    expect(prompts).not.toMatch(/发布|导出|删除|停用|重置密码/);
  });
});
