# 用户端恢复页与顶部账号操作 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用轻量认证恢复体验替换登录向导，并将用户账号操作迁移到全局搜索顶栏。

**Architecture:** `AuthTransitionScreen` 继续根据认证状态渲染，但仅显示当前恢复信息。`UserTopbarActions` 使用现有 `useAuth`、`ThemeMenu` 和设置路由，作为 `GlobalSearchTrigger` 的右侧插槽；侧边栏移除重复账号操作。

**Tech Stack:** Next.js 15、React 18、TypeScript、CSS、Vitest。

## 执行收尾（2026-07-22）

- 认证恢复页、顶栏账号操作和登录页收束已实现；认证与顶栏定向测试、用户端 typecheck、lint 和生产构建通过。
- 当前工作树中不包含认证协议、主题存储或 API 合同的越界改动。

## Global Constraints

- 不修改认证协议、会话存储、主题偏好存储、路由、API、合同或依赖。
- 本地与 OIDC 登录显示退出登录；开发模拟身份不显示退出操作。
- 认证恢复页面不得展示无法验证的分步完成进度。

---

### Task 1: 轻量认证恢复页

**Files:**

- Modify: `apps/user-portal/src/components/auth/AuthTransitionScreen.tsx`
- Modify: `apps/user-portal/src/components/auth/auth-transition.test.tsx`
- Create: `apps/user-portal/src/app/styles/auth-transition-refinement.css`
- Modify: `apps/user-portal/src/app/globals.css`

**Interfaces:**

- Consumes: `stage: 'checking' | 'entering'`。
- Produces: 具有 `role="status"`、当前状态和简短恢复说明的认证过渡页面。

- [ ] **Step 1: 更新失败断言**

```tsx
expect(html).toContain('正在恢复训练空间');
expect(html).toContain('无需重复操作');
expect(html).not.toContain('登录准备进度');
```

- [ ] **Step 2: 实现状态轨迹**

```tsx
<div className="auth-transition-status">
  <span aria-hidden="true" />
  <div>
    <strong>{copy.status}</strong>
    <small>无需重复操作，完成后自动进入</small>
  </div>
</div>
```

- [ ] **Step 3: 运行认证测试**

Run: `pnpm --filter @interview-agent/user-portal test -- auth-transition.test.tsx`
Expected: PASS。

### Task 2: 顶部账号操作

**Files:**

- Create: `apps/user-portal/src/components/shell/UserTopbarActions.tsx`
- Create: `apps/user-portal/src/components/shell/UserTopbarActions.test.tsx`
- Modify: `apps/user-portal/src/components/search/GlobalSearchTrigger.tsx`
- Modify: `apps/user-portal/src/components/UserShell.tsx`
- Modify: `apps/user-portal/src/components/shell/UserSidebar.tsx`
- Modify: `apps/user-portal/src/components/theme/ThemeMenu.tsx`
- Create: `apps/user-portal/src/app/styles/user-topbar.css`

**Interfaces:**

- Consumes: `useAuth()`, `sidebarAccountActions(mode)` 和 `ThemeMenu`。
- Produces: 搜索顶栏右侧的主题、个人设置、身份与退出操作。

- [ ] **Step 1: 写入账号操作测试**

```tsx
expect(markup).toContain('个人设置');
expect(markup).toContain('退出登录');
```

- [ ] **Step 2: 增加顶栏操作组件与搜索插槽**

```tsx
<GlobalSearchTrigger actions={<UserTopbarActions />} />
```

`UserTopbarActions` 必须在 `sidebarAccountActions(auth.mode)` 包含 `sign_out` 时才渲染退出按钮。

- [ ] **Step 3: 从侧边栏移除重复主题和账号区**

保留 `SidebarBrand` 与 `SidebarNavigation`，不再渲染 `ThemeMenu`、`SidebarUserSummary` 或 `SidebarAccount`。

### Task 3: 登录页信息收束与验证

**Files:**

- Modify: `apps/user-portal/src/components/auth/AccessStory.tsx`
- Create: `apps/user-portal/src/app/styles/auth-refinement.css`
- Modify: `apps/user-portal/src/app/globals.css`
- Test: `apps/user-portal/src/components/auth/auth-transition.test.tsx`
- Test: `apps/user-portal/src/components/shell/UserTopbarActions.test.tsx`

**Interfaces:**

- Consumes: 既有登录、注册与主题组件。
- Produces: 表单优先的登录入口和响应式顶部账号区。

- [ ] **Step 1: 缩减登录故事区**

删除 `JourneyRail`，只保留两条能力说明；使用新的样式覆盖文件扩大表单视觉权重。

- [ ] **Step 2: 运行定向与应用验证**

Run: `pnpm --filter @interview-agent/user-portal test -- auth-transition.test.tsx UserTopbarActions.test.tsx && pnpm --filter @interview-agent/user-portal typecheck && pnpm --filter @interview-agent/user-portal lint && pnpm --filter @interview-agent/user-portal build`
Expected: 所有命令以 exit code 0 结束。

- [ ] **Step 3: 复核范围**

Run: `git diff --check && git status --short`
Expected: 无空白错误且无认证、主题存储或 API 文件变更。
