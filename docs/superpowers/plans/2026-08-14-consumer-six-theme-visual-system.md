# C 端六主题视觉系统与动效升级 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `apps/user-portal` 实现六套完整可切换主题、统一中文字体与中文滚动字幕，并为页面进入、导航、训练任务和状态反馈增加可降级动效。

**Architecture:** 保留现有业务组件、Hook、API 与页面布局，通过 v2 主题偏好、语义 CSS token、Motion Provider 和少量可复用展示组件完成视觉升级。登录与首页使用主题环境层，内容密集页面只消费主题 token 和短促状态动画，避免视觉层侵入训练、面试与报告状态机。

**Tech Stack:** Next.js 15、React 18、TypeScript、CSS、Motion 13.1、Vitest、Playwright

## Global Constraints

- 仅修改 `apps/user-portal`、对应文档和 `pnpm-lock.yaml`；不改 Product API、Agent Runtime、Prisma、公共契约或 Admin Console。
- 六个主题 ID 固定为 `aurora | terminal | constructivist | daylight | glass | playground`；默认主题是 `daylight`。
- 所有导航、标签、状态提示和滚动字幕使用中文；RAG、MCP 等真实技术缩写可保留。
- 旧偏好迁移固定为 `dawn → daylight`、`ocean → glass`、`night → aurora`，并保留 `motion`。
- 取消独立 accent UI；组件只能消费语义 token，不能硬编码主题主色。
- 仅新增 `motion` 一个动画依赖，不引入 GSAP、AutoAnimate 或整套在线动画组件库。
- 动画关闭或匹配 `prefers-reduced-motion` 时，持续动画停止，内容仍完整可见和可操作。
- 现有 `apps/user-portal/next-env.d.ts` 与 `scripts/start-dev.mjs` 是用户改动，不覆盖、不还原、不纳入本任务。
- 本任务未授权 Git stage/commit/push；每个任务以测试和 `git diff --check` 作为检查点。

---

## File Structure

- `components/theme/theme-preferences.ts`：六主题类型、v1/v2 解析和迁移。
- `components/theme/ThemePreferencesProvider.tsx`：读取、应用和持久化 v2 偏好。
- `components/theme/ThemeMenu.tsx`：六主题预览与动态效果开关。
- `components/motion/MotionSystemProvider.tsx`：Motion 根配置和产品动态开关联动。
- `components/motion/PageMotion.tsx`：认证后页面进入/退出包装。
- `components/motion/StaggeredTitle.tsx`：中文短语错峰标题。
- `components/consumer/ChineseTicker.tsx`：无缝中文滚动字幕。
- `components/theme/ThemeAtmosphere.tsx`：登录/首页主题环境层。
- `app/styles/theme-system.css`：基础语义 token 和六主题覆盖。
- `app/styles/theme-atmospheres.css`：环境动画、降级与移动端策略。
- `app/styles/consumer-theme-surfaces.css`：现有业务页面的统一主题表面。
- 既有 consumer/auth/home/learning/practice CSS：保留布局，只删除与新 token 冲突的硬编码视觉。

---

### Task 1: 六主题偏好与旧数据迁移

**Files:**

- Modify: `apps/user-portal/src/components/theme/theme-preferences.ts`
- Modify: `apps/user-portal/src/components/theme/theme-preferences.test.ts`
- Modify: `apps/user-portal/src/components/theme/ThemePreferencesProvider.tsx`
- Modify: `apps/user-portal/src/app/layout.tsx`

**Interfaces:**

- Produces: `ThemeMode`, `ThemePreferences`, `parseThemePreferences(value)`, `parseStoredThemePreferences(v2, v1)`, `serializeThemePreferences(value)`。
- Consumes: 浏览器 `localStorage` 与 `<html data-theme data-motion>`。

- [ ] **Step 1: 写 v2 解析与 v1 迁移失败测试**

```ts
import {
  DEFAULT_THEME_PREFERENCES,
  LEGACY_THEME_STORAGE_KEY,
  THEME_STORAGE_KEY,
  parseStoredThemePreferences,
  parseThemePreferences,
  serializeThemePreferences,
} from './theme-preferences';

it('保留六主题和动态效果设置', () => {
  expect(parseThemePreferences({ theme: 'constructivist', motion: false })).toEqual({
    theme: 'constructivist',
    motion: false,
  });
});

it.each([
  ['dawn', 'daylight'],
  ['ocean', 'glass'],
  ['night', 'aurora'],
] as const)('把旧主题 %s 迁移为 %s', (legacyTheme, theme) => {
  expect(
    parseStoredThemePreferences(null, { theme: legacyTheme, accent: 'teal', motion: false }),
  ).toEqual({ theme, motion: false });
});

it('优先使用有效的 v2 偏好', () => {
  expect(
    parseStoredThemePreferences(
      { theme: 'playground', motion: true },
      { theme: 'night', accent: 'blue', motion: false },
    ),
  ).toEqual({ theme: 'playground', motion: true });
});

it('无效偏好回退到白昼主题', () => {
  expect(parseStoredThemePreferences({ theme: 'unknown' }, null)).toEqual(
    DEFAULT_THEME_PREFERENCES,
  );
});

it('使用 v2 键并可序列化后再解析', () => {
  expect(THEME_STORAGE_KEY).toBe('offerpilot:theme-preferences:v2');
  expect(LEGACY_THEME_STORAGE_KEY).toBe('offerpilot:theme-preferences:v1');
  const value = { theme: 'glass', motion: true } as const;
  expect(parseThemePreferences(JSON.parse(serializeThemePreferences(value)))).toEqual(value);
});
```

- [ ] **Step 2: 运行主题测试确认失败**

Run: `pnpm --filter @interview-agent/user-portal test -- src/components/theme/theme-preferences.test.ts`

Expected: FAIL，缺少 v2 常量、六主题类型和迁移函数。

- [ ] **Step 3: 实现主题类型与迁移函数**

```ts
export const THEME_STORAGE_KEY = 'offerpilot:theme-preferences:v2';
export const LEGACY_THEME_STORAGE_KEY = 'offerpilot:theme-preferences:v1';

export const THEMES = [
  'aurora',
  'terminal',
  'constructivist',
  'daylight',
  'glass',
  'playground',
] as const;

export type ThemeMode = (typeof THEMES)[number];
export type ThemePreferences = { theme: ThemeMode; motion: boolean };

export const DEFAULT_THEME_PREFERENCES: ThemePreferences = {
  theme: 'daylight',
  motion: true,
};

const LEGACY_THEME_MAP = {
  dawn: 'daylight',
  ocean: 'glass',
  night: 'aurora',
} as const;

export function parseThemePreferences(value: unknown): ThemePreferences {
  if (!isRecord(value) || !THEMES.includes(value.theme as ThemeMode)) {
    return DEFAULT_THEME_PREFERENCES;
  }
  return {
    theme: value.theme as ThemeMode,
    motion: typeof value.motion === 'boolean' ? value.motion : true,
  };
}

export function parseStoredThemePreferences(v2: unknown, v1: unknown): ThemePreferences {
  if (isRecord(v2) && THEMES.includes(v2.theme as ThemeMode)) return parseThemePreferences(v2);
  if (!isRecord(v1)) return DEFAULT_THEME_PREFERENCES;
  const theme = LEGACY_THEME_MAP[v1.theme as keyof typeof LEGACY_THEME_MAP];
  if (!theme) return DEFAULT_THEME_PREFERENCES;
  return { theme, motion: typeof v1.motion === 'boolean' ? v1.motion : true };
}

export function serializeThemePreferences(value: ThemePreferences) {
  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
```

- [ ] **Step 4: 更新 Provider，移除 accent 并迁移存储**

Provider context 只暴露 `setTheme`、`setMotion`。首次读取同时查询 v2/v1：

```ts
function readStoredPreferences() {
  try {
    const v2 = readJson(window.localStorage.getItem(THEME_STORAGE_KEY));
    const v1 = readJson(window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY));
    return parseStoredThemePreferences(v2, v1);
  } catch {
    return DEFAULT_THEME_PREFERENCES;
  }
}

function readJson(value: string | null): unknown {
  return value ? JSON.parse(value) : null;
}

function applyPreferences(preferences: ThemePreferences) {
  const root = document.documentElement;
  root.dataset.theme = preferences.theme;
  root.dataset.motion = preferences.motion ? 'on' : 'off';
  delete root.dataset.accent;
}
```

- [ ] **Step 5: 更新首屏同步启动脚本**

`layout.tsx` 的脚本读取 v2，失败时迁移 v1，并默认写入 `daylight`。脚本最终只设置 `data-theme`、`data-motion`，删除 `data-accent`。

- [ ] **Step 6: 运行测试与类型检查**

Run: `pnpm --filter @interview-agent/user-portal test -- src/components/theme/theme-preferences.test.ts`

Expected: PASS。

Run: `pnpm --filter @interview-agent/user-portal typecheck`

Expected: 可能暂时 FAIL 于仍使用 `AccentColor` 的 `ThemeMenu`；该失败在 Task 4 解决，主题偏好测试必须 PASS。

- [ ] **Step 7: 检查工作区边界**

Run: `git diff --check -- apps/user-portal/src/components/theme apps/user-portal/src/app/layout.tsx`

Expected: 无空白错误；不出现用户原有文件内容被覆盖。

---

### Task 2: 中文字体与 Motion 基础设施

**Files:**

- Modify: `apps/user-portal/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `apps/user-portal/src/app/layout.tsx`
- Create: `apps/user-portal/src/components/motion/MotionSystemProvider.tsx`
- Create: `apps/user-portal/src/components/motion/PageMotion.tsx`
- Create: `apps/user-portal/src/components/motion/motion-system.test.tsx`
- Modify: `apps/user-portal/src/components/WebProviders.tsx`
- Modify: `apps/user-portal/src/app/(app)/template.tsx`

**Interfaces:**

- Produces: `MotionSystemProvider`, `PageMotion`。
- Consumes: `ThemePreferences.motion`。

- [ ] **Step 1: 安装唯一动画依赖**

Run: `pnpm --filter @interview-agent/user-portal add motion@13.1.0`

Expected: `apps/user-portal/package.json` 新增 `motion`，`pnpm-lock.yaml` 更新。

- [ ] **Step 2: 写 Motion Provider 结构测试**

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PageMotion } from './PageMotion';

describe('页面动效基础设施', () => {
  it('保留页面内容和可定位的动效容器', () => {
    const markup = renderToStaticMarkup(
      <PageMotion>
        <h1>练习首页</h1>
      </PageMotion>,
    );
    expect(markup).toContain('route-motion-view');
    expect(markup).toContain('练习首页');
  });
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `pnpm --filter @interview-agent/user-portal test -- src/components/motion/motion-system.test.tsx`

Expected: FAIL，组件不存在。

- [ ] **Step 4: 实现 Motion 根配置**

```tsx
'use client';

import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';
import type { ReactNode } from 'react';
import { useThemePreferences } from '@/components/theme/ThemePreferencesProvider';

export function MotionSystemProvider({ children }: { children: ReactNode }) {
  const { preferences } = useThemePreferences();
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig
        reducedMotion={preferences.motion ? 'user' : 'always'}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
```

`PageMotion` 使用 `m.div`，初始 `{ opacity: 0, y: 10 }`，进入 `{ opacity: 1, y: 0 }`，并包含 `route-motion-view` class。

- [ ] **Step 5: 接入 Provider 和路由模板**

`WebProviders` 顺序为 `ThemePreferencesProvider → MotionSystemProvider → NotificationProvider → AuthProvider`。认证后模板返回：

```tsx
import { PageMotion } from '@/components/motion/PageMotion';

export default function AuthenticatedRouteTemplate({ children }: { children: React.ReactNode }) {
  return <PageMotion>{children}</PageMotion>;
}
```

- [ ] **Step 6: 替换字体角色**

`layout.tsx` 使用 `Noto_Sans_SC` 和 `JetBrains_Mono`：

```ts
const chineseFont = Noto_Sans_SC({
  display: 'swap',
  variable: '--font-chinese',
  weight: ['400', '500', '600', '700', '800', '900'],
});
const techFont = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-tech-face',
  weight: ['600', '700', '800'],
});
```

`html.className` 同时包含两个变量。CSS 后续映射到 `--font-display`、`--font-body`、`--font-tech`。

- [ ] **Step 7: 运行测试和类型检查**

Run: `pnpm --filter @interview-agent/user-portal test -- src/components/motion/motion-system.test.tsx`

Expected: PASS。

Run: `pnpm --filter @interview-agent/user-portal typecheck`

Expected: 除 Task 4 尚未处理的 ThemeMenu accent 类型外无新增错误。

---

### Task 3: 六主题语义 token 与环境动画

**Files:**

- Create: `apps/user-portal/src/app/styles/theme-system.css`
- Create: `apps/user-portal/src/app/styles/theme-atmospheres.css`
- Create: `apps/user-portal/src/components/theme/theme-system.test.ts`
- Modify: `apps/user-portal/src/app/styles/tokens.css`
- Modify: `apps/user-portal/src/app/globals.css`

**Interfaces:**

- Produces: 语义 token、`theme-atmosphere-*` class、六主题材质变量。
- Consumes: `<html data-theme>` 与 `<html data-motion>`。

- [ ] **Step 1: 写六主题 CSS 契约测试**

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve('src/app/styles/theme-system.css'), 'utf8');
const atmosphereCss = readFileSync(resolve('src/app/styles/theme-atmospheres.css'), 'utf8');

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
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @interview-agent/user-portal test -- src/components/theme/theme-system.test.ts`

Expected: FAIL，CSS 文件不存在。

- [ ] **Step 3: 建立基础 token**

`theme-system.css` 的基础层必须包含：

```css
:root {
  --font-display: var(--font-chinese), 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --font-body: var(--font-chinese), 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --font-tech: var(--font-tech-face), Consolas, monospace;
  --theme-canvas: #f7f8f5;
  --theme-surface: #ffffff;
  --theme-surface-raised: #ffffff;
  --theme-ink: #11131a;
  --theme-text-muted: #626a78;
  --theme-line: #dfe3eb;
  --theme-primary: #2457ff;
  --theme-secondary: #7f65db;
  --theme-accent: #f04732;
  --theme-success: #168676;
  --theme-warning: #b56a12;
  --theme-danger: #c93737;
  --theme-radius-panel: 0px;
  --theme-radius-control: 0px;
  --theme-shadow: 8px 8px 0 #11131a;
}
```

六主题分别覆盖色彩、半径、边框和阴影。`constructivist`/`daylight` 使用硬边，`terminal` 使用 4px 小圆角，`aurora`/`glass` 使用玻璃材质，`playground` 使用粗边和高饱和模块。

- [ ] **Step 4: 映射旧变量到新语义 token**

在 `tokens.css` 中让 `--canvas`、`--surface`、`--ink`、`--text-muted`、`--outline`、`--primary` 等兼容变量引用 `--theme-*`，保持既有 CSS 可工作：

```css
--canvas: var(--theme-canvas);
--surface: var(--theme-surface);
--ink: var(--theme-ink);
--text-muted: var(--theme-text-muted);
--outline: var(--theme-line);
--primary: var(--theme-primary);
--primary-strong: color-mix(in srgb, var(--theme-primary) 82%, #000);
--primary-soft: color-mix(in srgb, var(--theme-primary) 12%, var(--theme-surface));
```

- [ ] **Step 5: 实现环境层及降级**

`theme-atmospheres.css` 提供 `.theme-atmosphere`、`.theme-atmosphere-grid`、`.theme-atmosphere-orbit`、`.theme-atmosphere-particles`。持续动画仅使用 `transform`/`opacity`，并在 `data-motion='off'`、`prefers-reduced-motion` 下关闭。

- [ ] **Step 6: 调整 CSS 导入顺序**

`globals.css` 顺序为 `tokens.css → theme-system.css → theme-atmospheres.css → theme controls/shell/primitives → 页面 CSS → consumer-theme-surfaces.css`，确保新主题覆盖旧硬编码。

- [ ] **Step 7: 运行样式测试**

Run: `pnpm --filter @interview-agent/user-portal test -- src/components/theme/theme-system.test.ts`

Expected: PASS。

Run: `git diff --check -- apps/user-portal/src/app/styles`

Expected: 无空白错误。

---

### Task 4: 六主题菜单与全局外壳

**Files:**

- Modify: `apps/user-portal/src/components/theme/ThemeMenu.tsx`
- Modify: `apps/user-portal/src/components/theme/theme-preferences.test.ts`
- Create: `apps/user-portal/src/components/theme/ThemeMenu.test.tsx`
- Modify: `apps/user-portal/src/app/styles/theme-controls.css`
- Modify: `apps/user-portal/src/app/styles/theme-controls-responsive.css`
- Modify: `apps/user-portal/src/app/styles/consumer-shell.css`
- Modify: `apps/user-portal/src/components/UserShell.tsx`

**Interfaces:**

- Consumes: `ThemeMode`、`useThemePreferences().setTheme/setMotion`。
- Produces: 六主题预览、中文说明、动态效果开关。

- [ ] **Step 1: 写主题菜单渲染测试**

```tsx
it('渲染六套中文主题并移除独立强调色', () => {
  const markup = renderToStaticMarkup(<ThemeMenu variant="topbar" />);
  for (const label of [
    '极光叙事',
    '终端工业',
    '结构主义印刷',
    '白昼编辑部',
    '雾光玻璃',
    '彩色训练场',
  ]) {
    expect(markup).toContain(label);
  }
  expect(markup).not.toContain('主题色');
  expect(markup).toContain('界面动态效果');
});
```

测试使用已有 Provider 测试模式或为 `ThemeMenu` 提供导出的纯数据 `THEME_OPTIONS`，避免伪造业务上下文。

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @interview-agent/user-portal test -- src/components/theme/ThemeMenu.test.tsx`

Expected: FAIL，当前只有三主题与 accent 选择。

- [ ] **Step 3: 实现六主题选项**

```ts
export const THEME_OPTIONS = [
  { value: 'aurora', label: '极光叙事', helper: '渐变巨字与星空轨道' },
  { value: 'terminal', label: '终端工业', helper: '命令语义与状态扫描' },
  { value: 'constructivist', label: '结构主义印刷', helper: '红黑米白与硬边构图' },
  { value: 'daylight', label: '白昼编辑部', helper: '高对比明亮阅读' },
  { value: 'glass', label: '雾光玻璃', helper: '通透材质与空间景深' },
  { value: 'playground', label: '彩色训练场', helper: '明亮模块与成长反馈' },
] satisfies Array<{ value: ThemeMode; label: string; helper: string }>;
```

删除 `AccentColor`、`setAccent`、`ThemeAccentSection`。Popover 保留主题列表和动态效果行。

- [ ] **Step 4: 重做预览与响应式样式**

桌面 Popover 允许 2 列主题预览，移动端单列。每个 `.theme-preview-*` 使用纯 CSS 表达对应色彩和边框，不加载图片。

- [ ] **Step 5: 给外壳增加主题环境挂载点**

`UserShell` 在 header 前加入 `<ThemeAtmosphere context="shell" />`，环境层 `aria-hidden` 且不拦截指针。顶栏与搜索入口消费语义 token，保留既有 pending、快捷键与账户行为。

- [ ] **Step 6: 运行主题与导航测试**

Run: `pnpm --filter @interview-agent/user-portal test -- src/components/theme src/components/shell/navigation-rendering.test.tsx src/components/shell/navigation.test.ts`

Expected: PASS。

Run: `pnpm --filter @interview-agent/user-portal typecheck`

Expected: PASS。

---

### Task 5: 中文标题、滚动字幕与登录/首页品牌层

**Files:**

- Create: `apps/user-portal/src/components/motion/StaggeredTitle.tsx`
- Create: `apps/user-portal/src/components/motion/StaggeredTitle.test.tsx`
- Create: `apps/user-portal/src/components/consumer/ChineseTicker.tsx`
- Create: `apps/user-portal/src/components/consumer/ChineseTicker.test.tsx`
- Create: `apps/user-portal/src/components/theme/ThemeAtmosphere.tsx`
- Modify: `apps/user-portal/src/components/auth/AccessStory.tsx`
- Modify: `apps/user-portal/src/components/home/question-hub/HomeWelcome.tsx`
- Modify: `apps/user-portal/src/components/home/question-hub/AgentRecommendationRail.tsx`
- Modify: `apps/user-portal/src/app/styles/consumer-auth.css`
- Modify: `apps/user-portal/src/app/styles/consumer-home.css`
- Modify: `apps/user-portal/src/app/styles/consumer-motion.css`

**Interfaces:**

- Produces: `StaggeredTitle({ segments, as? })`、`ChineseTicker({ items })`、`ThemeAtmosphere({ context })`。
- Consumes: 现有首页推荐、继续训练与认证结构。

- [ ] **Step 1: 写中文展示组件测试**

```tsx
it('标题保留完整可访问名称并按短语分段', () => {
  const markup = renderToStaticMarkup(
    <StaggeredTitle segments={['今天，', '只练', '最有价值的', '一题。']} />,
  );
  expect(markup).toContain('aria-label="今天，只练最有价值的一题。"');
  expect(markup.match(/staggered-title-segment/g)).toHaveLength(4);
});

it('滚动字幕全部使用中文训练概念并复制队列', () => {
  const markup = renderToStaticMarkup(<ChineseTicker />);
  for (const text of [
    '上下文工程',
    '检索增强生成',
    '工具调用',
    '智能体记忆',
    '面试证据',
    '训练复盘',
  ]) {
    expect(markup).toContain(text);
  }
  expect(markup).not.toContain('CONTEXT ENGINEERING');
  expect(markup).toContain('aria-hidden="true"');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @interview-agent/user-portal test -- src/components/motion/StaggeredTitle.test.tsx src/components/consumer/ChineseTicker.test.tsx`

Expected: FAIL，组件不存在。

- [ ] **Step 3: 实现 StaggeredTitle**

使用 `m.span` 和 `useReducedMotion`。可访问名称放在容器 `aria-label`，视觉 segment `aria-hidden`。每段延迟 `index * 0.07s`，关闭动画时直接显示。

- [ ] **Step 4: 实现 ChineseTicker**

默认 items 固定为六个中文训练概念。第一队列可访问，复制队列 `aria-hidden`，CSS 使用 `translate3d` 形成无缝循环；hover/focus-within 可暂停，关闭动画时静态换行显示。

- [ ] **Step 5: 实现 ThemeAtmosphere**

组件只输出语义元素，不读取业务数据：

```tsx
export function ThemeAtmosphere({ context }: { context: 'auth' | 'home' | 'shell' }) {
  return (
    <div className={`theme-atmosphere theme-atmosphere-${context}`} aria-hidden="true">
      <span className="theme-atmosphere-grid" />
      <span className="theme-atmosphere-orbit" />
      <span className="theme-atmosphere-particles" />
    </div>
  );
}
```

- [ ] **Step 6: 接入登录与首页**

`AccessStory` 使用 `ThemeAtmosphere context="auth"` 和四段中文 `StaggeredTitle`；不改登录表单。

`HomeWelcome` 用短语段代替旧逐字符 `SplitRevealText`。`AgentRecommendationRail` 在 welcome 与主任务间加入 `<ChineseTicker />`，保留推荐、继续训练、错误、空态和自主组题路径。

- [ ] **Step 7: 重做 auth/home 视觉，不改布局契约**

清除 `consumer-auth.css`、`consumer-home.css` 中固定 coral/violet/dark card 颜色，改用语义 token。六主题通过 `[data-theme]` 改变硬边、玻璃、终端和高饱和材质；登录表单字段始终使用高对比 `--theme-surface`。

- [ ] **Step 8: 运行定向测试**

Run: `pnpm --filter @interview-agent/user-portal test -- src/components/motion/StaggeredTitle.test.tsx src/components/consumer/ChineseTicker.test.tsx src/components/auth/AccessStory.test.tsx src/components/home/question-hub/HomeWelcome.test.tsx src/components/home/question-hub/AgentRecommendationRail.test.tsx src/components/home/question-hub/TrainingContinuationCard.test.tsx`

Expected: PASS。

---

### Task 6: 全部业务页面主题表面与短促反馈

**Files:**

- Create: `apps/user-portal/src/app/styles/consumer-theme-surfaces.css`
- Create: `apps/user-portal/src/components/theme/consumer-theme-surfaces.test.ts`
- Modify: `apps/user-portal/src/app/globals.css`
- Modify: `apps/user-portal/src/app/styles/consumer-learning.css`
- Modify: `apps/user-portal/src/app/styles/consumer-practice.css`
- Modify: `apps/user-portal/src/app/styles/interview-refinement.css`
- Modify: `apps/user-portal/src/app/styles/profile.css`
- Modify: `apps/user-portal/src/app/styles/training-archive.css`
- Modify: `apps/user-portal/src/app/styles/mistake-book.css`
- Modify: `apps/user-portal/src/app/styles/settings.css`
- Modify: `apps/user-portal/src/app/styles/global-search.css`
- Modify: `apps/user-portal/src/app/styles/user-agent.css`

**Interfaces:**

- Consumes: 既有页面 class 与 Task 3 语义 token。
- Produces: 统一 `.card/.panel/.button/.input` 表面、主题特有材质与 `data-motion` 反馈。

- [ ] **Step 1: 写业务表面覆盖测试**

```ts
const css = readFileSync(resolve('src/app/styles/consumer-theme-surfaces.css'), 'utf8');

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

it('不在共享表面硬编码旧 coral/violet 色', () => {
  expect(css).not.toMatch(/#df5c3b|#6258ea/i);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @interview-agent/user-portal test -- src/components/theme/consumer-theme-surfaces.test.ts`

Expected: FAIL，文件不存在。

- [ ] **Step 3: 建立跨页面共享表面**

`consumer-theme-surfaces.css` 统一页面 canvas、panel、输入、按钮、空态、错误态、焦点和禁用态。只调整颜色、字体、边框、圆角、阴影和短促 transform，不改变 grid/flex 布局尺寸。

- [ ] **Step 4: 为六主题增加材质差异**

- `aurora`：暗色半透明面板与低速柔光；正文面板保持不透明度。
- `terminal`：细边框、小圆角、等宽编号；无持续粒子。
- `constructivist`：零圆角、厚边框、硬投影；正文不旋转。
- `daylight`：白底网格、高对比黑线、钴蓝/朱红状态。
- `glass`：导航和辅助卡片玻璃；输入和正文使用高不透明表面。
- `playground`：粗边高饱和摘要卡；题目与报告正文仍为浅色中性表面。

- [ ] **Step 5: 清理页面级旧色彩冲突**

在列出的既有 CSS 文件中，把硬编码视觉颜色替换为语义 token。保留状态特有 success/warning/danger 语义，不改变布局、断点与内容顺序。

- [ ] **Step 6: 运行业务组件回归测试**

Run: `pnpm --filter @interview-agent/user-portal test -- src/components/practice src/components/learning src/components/interview src/components/profile src/components/reports src/components/settings src/components/search src/components/user-agent`

Expected: PASS。

Run: `pnpm --filter @interview-agent/user-portal lint`

Expected: PASS。

Run: `pnpm --filter @interview-agent/user-portal typecheck`

Expected: PASS。

---

### Task 7: 全量验证与浏览器视觉检查

**Files:**

- Verify: `apps/user-portal/src/**/*`
- Verify: `apps/user-portal/package.json`
- Verify: `pnpm-lock.yaml`

**Interfaces:**

- Consumes: Tasks 1–6 的完整实现。
- Produces: 自动化门禁结果、桌面/移动浏览器验证记录和明确未验证边界。

- [ ] **Step 1: 运行完整用户端测试**

Run: `pnpm --filter @interview-agent/user-portal test`

Expected: 所有测试 PASS，无未处理 Promise 或控制台错误。

- [ ] **Step 2: 运行静态门禁**

Run: `$env:NODE_ENV='development'; pnpm --filter @interview-agent/user-portal lint`

Expected: PASS。

Run: `pnpm --filter @interview-agent/user-portal typecheck`

Expected: PASS。

- [ ] **Step 3: 运行生产构建**

Run: `pnpm --filter @interview-agent/user-portal build`

Expected: PASS；Next.js 成功生成所有用户端路由。

- [ ] **Step 4: 检查桌面六主题**

在 1440×1000 打开登录与首页，依次切换六主题，确认：

- 主题切换不触发数据重新请求或页面重挂载。
- 标题、滚动字幕、任务卡与导航动画连续。
- 中文换行正常，无横向溢出，主行动无遮挡。
- 刷新后主题保持，v1 旧偏好可迁移。

- [ ] **Step 5: 检查业务页代表主题**

在 `daylight`、`aurora`、`constructivist`、`glass` 下检查刷题入口、练习播放器、学习中心、模拟面试、成长档案、设置、全局搜索和用户 Agent。确认内容页没有持续背景干扰，输入与正文对比度清晰。

- [ ] **Step 6: 检查移动端和动态降级**

在 390×844 检查登录、首页、练习播放器、学习中心、主题菜单和底部导航。分别验证：

- 产品动态效果开启。
- 产品动态效果关闭。
- 浏览器 `prefers-reduced-motion: reduce`。

Expected: 关闭动画时内容即时可见，环境层静止或隐藏，所有操作仍可完成。

- [ ] **Step 7: 检查改动边界**

Run: `git diff --check`

Expected: 无空白错误。

Run: `git status --short`

Expected: 保留用户原有 `apps/user-portal/next-env.d.ts`、`scripts/start-dev.mjs`；本任务文件清晰可辨；未 stage、未 commit、未 push。
