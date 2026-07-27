# 后台管理体验打磨 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在既有管理后台中交付快捷工作台、显示偏好和数据驱动的治理待办。

**Architecture:** 新增一层浏览器本地的工作台状态，供顶部、侧栏与总览共享；现有导航与 Dashboard API 仍是唯一事实来源。外观和密度由 Provider 注入 Ant Design theme token，并通过根元素数据属性同步 CSS token。

**Tech Stack:** Next.js 15、React 18、TypeScript、Ant Design 6、Vitest。

## Global Constraints

- 不变更 Product API、contracts、数据库、权限角色、hash 路由或根配置。
- 本地状态必须按 `canAccessAdminView` 过滤，禁止由客户端创建权限入口。
- 仅使用 `/admin/dashboard` 已有数据生成治理事项。

---

### Task 1: 工作台偏好状态与主题基础

**Files:**

- Create: `apps/admin-console/src/components/admin-workspace-model.ts`
- Create: `apps/admin-console/src/components/admin-workspace-model.test.ts`
- Create: `apps/admin-console/src/components/admin-workspace-context.tsx`
- Modify: `apps/admin-console/src/components/AdminProviders.tsx`
- Modify: `apps/admin-console/src/components/admin-theme.ts`
- Modify: `apps/admin-console/src/app/styles/tokens.css`

- [ ] 编写最近访问、收藏切换和持久化过滤的失败测试。
- [ ] 运行 `pnpm --filter @interview-agent/admin-console test -- admin-workspace-model.test.ts`，确认测试因模块缺失失败。
- [ ] 实现纯状态模型与浏览器持久化 Context；将外观和密度注入 Ant Design 和 CSS 根属性。
- [ ] 再次运行定向测试，确认通过。

### Task 2: 快捷导航与个人工作台

**Files:**

- Create: `apps/admin-console/src/components/admin-shell/AdminCommandPalette.tsx`
- Create: `apps/admin-console/src/components/dashboard/AdminWorkspacePanel.tsx`
- Modify: `apps/admin-console/src/components/admin-shell/AdminHeader.tsx`
- Modify: `apps/admin-console/src/components/admin-shell/AdminSidebar.tsx`
- Modify: `apps/admin-console/src/components/dashboard/AdminDashboard.tsx`
- Modify: `apps/admin-console/src/components/dashboard/AdminOverview.tsx`
- Modify: `apps/admin-console/src/app/styles/shell.css`

- [ ] 为命令面板、收藏和最近访问的可访问导航写失败测试。
- [ ] 运行相应 Vitest 测试，确认新增行为缺失。
- [ ] 实现 `Ctrl/⌘ K` 命令面板、收藏当前页、最近访问记录和侧栏/总览工作台。
- [ ] 运行定向测试，确认通过。

### Task 3: 数据驱动治理待办与全量验证

**Files:**

- Create: `apps/admin-console/src/components/dashboard/admin-attention-queue.ts`
- Create: `apps/admin-console/src/components/dashboard/admin-attention-queue.test.ts`
- Create: `apps/admin-console/src/components/dashboard/AdminAttentionQueue.tsx`
- Modify: `apps/admin-console/src/components/dashboard/AdminOverview.tsx`

- [ ] 编写失败测试，覆盖待审核、失败导入、运行风险和 Schema 风险的排序与跳转。
- [ ] 运行定向测试，确认函数尚不存在。
- [ ] 实现纯事项计算与总览卡片；无事项时显示正常状态。
- [ ] 运行 `pnpm --filter @interview-agent/admin-console test`、`typecheck`、`lint`、`build`，修复与本次改动有关的问题。
