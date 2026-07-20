import { describe, expect, it } from 'vitest';
import { userAgentQuickActions } from './user-agent-quick-actions';

describe('user agent quick actions', () => {
  it('starts with safe, practice-focused shortcuts', () => {
    expect(userAgentQuickActions.map((action) => action.id)).toEqual([
      'today-plan',
      'weakness-practice',
      'recent-mistakes',
      'review-center',
    ]);
    expect(userAgentQuickActions.every((action) => action.prompt.length > 0)).toBe(true);
  });

  it('does not advertise an unconfirmed paid operation', () => {
    const prompts = userAgentQuickActions.map((action) => action.prompt).join(' ');
    expect(prompts).not.toMatch(/直接生成整轮复盘|自动提交|批量评价/);
  });
});
