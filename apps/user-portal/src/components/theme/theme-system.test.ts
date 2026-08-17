import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve('src/app/styles/theme-system.css'), 'utf8');
const atmosphereCss = readFileSync(resolve('src/app/styles/theme-atmospheres.css'), 'utf8');
const shellCss = readFileSync(resolve('src/app/styles/consumer-shell.css'), 'utf8');

describe('六主题样式契约', () => {
  it.each(['aurora', 'terminal', 'constructivist', 'daylight', 'glass', 'playground'])(
    '包含 %s 主题',
    (theme) => expect(css).toContain(`html[data-theme='${theme}']`),
  );

  it.each([
    '--theme-canvas',
    '--theme-surface',
    '--theme-ink',
    '--theme-primary',
    '--theme-radius-panel',
  ])('定义语义变量 %s', (token) => expect(css).toContain(token));

  it('为关闭动态效果提供环境层降级', () => {
    expect(atmosphereCss).toContain("html[data-motion='off'] .theme-atmosphere");
    expect(atmosphereCss).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('只提升主内容层，不覆盖跳转链接、顶栏和全局浮层定位', () => {
    expect(shellCss).toContain('.sidebar-shell > .main {');
    expect(shellCss).not.toContain('.sidebar-shell > :not(.theme-atmosphere)');
  });
});
