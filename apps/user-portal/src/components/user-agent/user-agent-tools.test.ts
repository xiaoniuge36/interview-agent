import { describe, expect, it } from 'vitest';
import { userAgentNavigationPath } from './user-agent-tools';

describe('User Agent 页面导航', () => {
  it('将题库导航标记为 Agent 训练交接，同时保持其他页面原路径', () => {
    expect(userAgentNavigationPath('questions')).toBe('/questions?source=agent');
    expect(userAgentNavigationPath('reports')).toBe('/reports');
  });
});
