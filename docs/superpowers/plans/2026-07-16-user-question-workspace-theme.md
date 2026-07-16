# C 端题库工作台与主题系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将已确认的“暖白 + 海军蓝 + 珊瑚橙”题库大厅原型落地到用户端，并增加可持久化的明暗主题与独立主题色切换。

**Architecture:** 保留现有 `/questions` 真实题库、推荐和练习创建 API，不修改共享 contract 或数据库。主题偏好由客户端 Provider 管理，以 `data-theme` 和 `data-accent` 驱动 CSS tokens；题库页继续使用现有筛选与题单 hook，仅增加真实推荐展示和当前结果快速组卷。

**Tech Stack:** Next.js 15、React 18、TypeScript、CSS Modules-style global layers、Vitest、Browser/IAB QA。

---

### Task 1: 主题偏好模型

**Files:**
- Create: `apps/user-portal/src/components/theme/theme-preferences.ts`
- Create: `apps/user-portal/src/components/theme/theme-preferences.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
expect(parseThemePreferences({ theme: 'night', accent: 'teal' })).toEqual({
  theme: 'night',
  accent: 'teal',
  motion: true,
});
expect(parseThemePreferences({ theme: 'unknown', accent: 'pink' })).toEqual(DEFAULT_THEME_PREFERENCES);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @interview-agent/user-portal test -- theme-preferences.test.ts`

Expected: FAIL，模块尚不存在。

- [ ] **Step 3: 实现主题类型、解析和序列化**

```ts
export type ThemeMode = 'dawn' | 'ocean' | 'night';
export type AccentColor = 'coral' | 'blue' | 'teal' | 'amber';
export type ThemePreferences = { theme: ThemeMode; accent: AccentColor; motion: boolean };
export const DEFAULT_THEME_PREFERENCES: ThemePreferences = {
  theme: 'dawn',
  accent: 'coral',
  motion: true,
};
```

- [ ] **Step 4: 运行定向测试确认通过**

Run: `pnpm --filter @interview-agent/user-portal test -- theme-preferences.test.ts`

Expected: PASS。

### Task 2: 无闪烁主题 Provider 与控制面板

**Files:**
- Create: `apps/user-portal/src/components/theme/ThemePreferencesProvider.tsx`
- Create: `apps/user-portal/src/components/theme/ThemeMenu.tsx`
- Create: `apps/user-portal/src/app/styles/theme-controls.css`
- Modify: `apps/user-portal/src/components/WebProviders.tsx`
- Modify: `apps/user-portal/src/app/layout.tsx`
- Modify: `apps/user-portal/src/app/globals.css`
- Modify: `apps/user-portal/src/components/UserShell.tsx`
- Modify: `apps/user-portal/src/components/shell/UserSidebar.tsx`

- [ ] **Step 1: 在根布局注入同步 bootstrap script**

脚本在 hydration 前读取 `offerpilot:theme-preferences:v1`，设置 `html.dataset.theme`、`html.dataset.accent` 和 `html.dataset.motion`，读取失败时使用 `dawn/coral/on`。

- [ ] **Step 2: 实现 Provider**

Provider 暴露 `preferences`、`setTheme`、`setAccent`、`setMotion`，每次更新同时写入 DOM dataset 和 localStorage；使用稳定的 `useCallback`，不在 render 中重复读取 storage。

- [ ] **Step 3: 实现 ThemeMenu**

菜单提供三种外观：晨光、海盐、深夜；四种主题色：珊瑚、蓝色、薄荷、琥珀；提供动效开关、ARIA pressed 状态、Escape/外部点击关闭。

- [ ] **Step 4: 接入桌面侧栏和移动端浮动入口**

桌面入口放在侧栏底部账户区上方，移动端入口由 `UserShell` 渲染为右上角紧凑按钮，不改变现有底部导航。

### Task 3: 主题 tokens 与壳层视觉

**Files:**
- Modify: `apps/user-portal/src/app/styles/tokens.css`
- Modify: `apps/user-portal/src/app/styles/shell.css`

- [ ] **Step 1: 建立模式 tokens**

`dawn` 使用暖白画布、海军蓝侧栏；`ocean` 使用冷灰蓝画布；`night` 使用深色画布和表面。模式只定义背景、表面、文字、边框和侧栏颜色。

- [ ] **Step 2: 建立独立 accent tokens**

`data-accent` 单独覆盖 `--primary`、`--primary-strong`、`--primary-soft`、`--primary-glow`，保证主题色可以在三种模式中自由组合。

- [ ] **Step 3: 将壳层核心硬编码颜色改为 tokens**

覆盖侧栏背景、激活导航、品牌标、头像、主按钮和 focus ring；保留成功/危险等语义色，不用主题色替代状态色。

### Task 4: 真实推荐与快速组卷行为

**Files:**
- Modify: `apps/user-portal/src/components/questions/question-picker-model.ts`
- Modify: `apps/user-portal/src/components/questions/question-picker-model.test.ts`
- Modify: `apps/user-portal/src/components/questions/useQuestionPicker.ts`
- Create: `apps/user-portal/src/components/questions/QuestionRecommendationBanner.tsx`

- [ ] **Step 1: 为快速组卷写失败测试**

```ts
expect(composeQuestionSelection(['q-1'], ['q-1', 'q-2', 'q-3'], 3)).toEqual([
  'q-1',
  'q-2',
  'q-3',
]);
```

- [ ] **Step 2: 实现去重、上限明确的快速组卷模型**

候选来自当前后端 `recommended` 排序结果；不伪造模型输出，不越过 10 题上限。

- [ ] **Step 3: 在 hook 中并行加载真实 `/practice-recommendations`**

推荐失败不得阻断自主题库；采用推荐继续使用现有 `createPracticeSession` 创建真实练习。

- [ ] **Step 4: 实现推荐横幅**

横幅展示推荐标题、原因、题数和预计时长，按钮为“采用并开始训练”；清楚提示档案只影响 Agent 推荐，不限制自主刷题。

### Task 5: 题库页面按已确认原型落地

**Files:**
- Modify: `apps/user-portal/src/components/questions/QuestionPickerPage.tsx`
- Modify: `apps/user-portal/src/components/questions/QuestionFilterPanel.tsx`
- Modify: `apps/user-portal/src/components/questions/QuestionCatalogList.tsx`
- Modify: `apps/user-portal/src/components/questions/SelectedQuestionTray.tsx`
- Modify: `apps/user-portal/src/app/styles/question-picker-base.css`
- Modify: `apps/user-portal/src/app/styles/question-picker-tray.css`
- Modify: `apps/user-portal/src/app/styles/question-picker-states.css`
- Create: `apps/user-portal/src/app/styles/question-picker-agent.css`
- Modify: `apps/user-portal/src/app/styles/question-picker.css`

- [ ] **Step 1: 重组标题、搜索、推荐、列表、Agent 题单的语义层级**

保留现有路由、查询参数、分页和创建练习行为；标题改为“今天想练什么？”，右侧题单继续支持删除、清空和开始练习。

- [ ] **Step 2: 实现真实状态和微动效**

加入卡片入场、Agent 呼吸、选中反馈、快速组卷 loading；所有动画受 `data-motion` 和 `prefers-reduced-motion` 控制。

- [ ] **Step 3: 完成 375/768/1440 响应式**

桌面为题库 + Agent 侧栏；小屏题单变为固定底部操作条，筛选器横向滚动，不产生页面横向溢出。

### Task 6: 验证与视觉对照

**Files:**
- Reference: `C:/Users/69483/.gstack/projects/interview-agent/designs/question-bank-agent-20260716/finalized.html`
- Reference: `C:/Users/69483/.gstack/projects/interview-agent/designs/question-bank-agent-20260716/final-v2-dawn-desktop.png`

- [ ] **Step 1: 运行定向测试、lint、typecheck、build**

```powershell
pnpm --filter @interview-agent/user-portal test
pnpm --filter @interview-agent/user-portal lint
pnpm --filter @interview-agent/user-portal typecheck
pnpm --filter @interview-agent/user-portal build
```

- [ ] **Step 2: Browser/IAB 验证**

验证自主搜索、筛选、加入/移除、快速组卷、推荐启动、主题/主题色/动效开关，并检查 375、768、1440 三档。

- [ ] **Step 3: 做五点 fidelity ledger**

逐项比较布局、标题与 CTA、颜色、卡片密度、右侧 Agent 题单、移动端折叠和动效；可修复偏差全部修复后再交付。

---

本计划不包含 shared contract、数据库、API schema、依赖和 CI 变更，也不执行 commit/push。
