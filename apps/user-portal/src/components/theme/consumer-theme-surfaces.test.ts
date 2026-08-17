import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve('src/app/styles/consumer-theme-surfaces.css'), 'utf8');

describe('业务页面主题表面', () => {
  it.each([
    '.practice-player-shell',
    '.learning-center',
    '.interview-workspace',
    '.profile-panel',
    '.training-archive',
    '.settings-workspace',
    '.global-search-dialog',
    '.user-agent-drawer',
  ])('覆盖业务表面 %s', (selector) => expect(css).toContain(selector));

  it('不在共享表面硬编码旧珊瑚色或旧紫色', () => {
    expect(css).not.toMatch(/#df5c3b|#6258ea/i);
  });
});
