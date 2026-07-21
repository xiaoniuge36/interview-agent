# 前后台 Page Agent 场景化助手 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让现有前台与后台 Page Agent 根据用户所在页面展示对应的安全快捷动作，并将场景写入模型运行时指令。

**Architecture:** 前后台各自使用一个纯函数场景模块，将已知路由或后台 `AdminView` 映射为标题、说明、快捷动作与简短指令。Widget 把场景传递给 Drawer 和 runtime；runtime 仅重建当前会话的 PageAgentCore 以应用页面变化，不改变 API、数据库或权限实现。

**Tech Stack:** React 18、Next.js 15、TypeScript、Ant Design、Vitest、PageAgentCore。

## Global Constraints

- 不新增 API、数据库、权限、模型调用或全局轮询。
- 快捷动作只允许现有只读查询和导航；不得自动创建练习、提交答案、AI 评估、生成复盘、审核、发布、导出或修改账号、模型。
- 不把 API Key、Token、密码、手机号、邮箱或完整页面 DOM 传入模型上下文。
- 保留工作树中其他未提交改动；不执行 reset、checkout、提交、推送或修改 Git 历史。

---

### Task 1: 前后台场景规则及单元测试

**Files:**
- Create: `apps/user-portal/src/components/user-agent/user-agent-page-context.ts`
- Create: `apps/user-portal/src/components/user-agent/user-agent-page-context.test.ts`
- Create: `apps/admin-console/src/components/admin-agent/admin-agent-page-context.ts`
- Create: `apps/admin-console/src/components/admin-agent/admin-agent-page-context.test.ts`

**Interfaces:**
- `resolveUserAgentPageContext(pathname: string): UserAgentPageContext`
- `resolveAdminAgentPageContext(view: AdminView, role?: string): AdminAgentPageContext`
- 两个 context 都包含 `id`、`title`、`description`、`quickActions`、`runtimeInstructions`。

- [ ] **Step 1: 编写失败的前台场景测试。**

```ts
expect(resolveUserAgentPageContext('/practice/session-1').id).toBe('practice');
expect(resolveUserAgentPageContext('/reports').quickActions.map(({ id }) => id))
  .toContain('review-weaknesses');
expect(resolveUserAgentPageContext('/unrecognized').id).toBe('training-overview');
```

- [ ] **Step 2: 编写失败的后台场景测试。**

```ts
expect(resolveAdminAgentPageContext('content', 'admin').id).toBe('review-workbench');
expect(resolveAdminAgentPageContext('runtime', 'admin').quickActions.map(({ id }) => id))
  .toContain('runtime-failures');
expect(resolveAdminAgentPageContext('analytics', 'admin').quickActions.map(({ id }) => id))
  .not.toContain('ai-usage');
```

- [ ] **Step 3: 运行聚焦测试并确认因模块缺失失败。**

Run: `pnpm --filter @interview-agent/user-portal test -- user-agent-page-context.test.ts && pnpm --filter @interview-agent/admin-console test -- admin-agent-page-context.test.ts`

Expected: FAIL，报场景模块无法解析。

- [ ] **Step 4: 实现场景映射。**

前台覆盖首页/题库、练习、复盘、档案/JD、设置和默认场景；后台覆盖总览、看板、导入、题库、审核、模型、运行、审计和账号。每个 action 的 prompt 需明确“查询、解释或带我前往”，不含写入词汇。平台 AI 用量仅在 `platform_admin` 场景动作中出现。

- [ ] **Step 5: 重新运行聚焦测试。**

Run: `pnpm --filter @interview-agent/user-portal test -- user-agent-page-context.test.ts && pnpm --filter @interview-agent/admin-console test -- admin-agent-page-context.test.ts`

Expected: PASS。

### Task 2: 前台场景化快捷入口与运行时上下文

**Files:**
- Modify: `apps/user-portal/src/components/user-agent/UserAgentWidget.tsx`
- Modify: `apps/user-portal/src/components/user-agent/UserAgentDrawer.tsx`
- Modify: `apps/user-portal/src/components/user-agent/user-agent-runtime.ts`
- Modify: `apps/user-portal/src/components/user-agent/useUserAgentRuntime.ts`
- Modify: `apps/user-portal/src/components/user-agent/user-agent-quick-actions.ts`
- Modify: `apps/user-portal/src/components/user-agent/user-agent-runtime.test.ts`

**Interfaces:**
- Widget uses `usePathname()` and `resolveUserAgentPageContext(pathname)`.
- Drawer receives `pageContext: UserAgentPageContext` and renders its title, description and actions for empty conversations.
- `useUserAgentRuntime` receives `pageContext: string`; `createUserAgentRuntime` includes it in system instructions.

- [ ] **Step 1: 追加失败的 runtime 测试。**

```ts
expect(buildUserAgentInstructions('会话内容', '当前在练习空间，只提供解题指导。'))
  .toContain('当前在练习空间，只提供解题指导。');
expect(buildUserAgentInstructions(undefined, '当前在复盘中心。')).toContain('未经用户确认');
```

- [ ] **Step 2: 运行聚焦测试并确认导出函数不存在。**

Run: `pnpm --filter @interview-agent/user-portal test -- user-agent-runtime.test.ts`

Expected: FAIL，报 `buildUserAgentInstructions` 未导出。

- [ ] **Step 3: 接入前台上下文。**

在 Widget 用 `usePathname` 计算 context，传递给 Drawer 和 hook；空会话使用 context 快捷动作、标题和说明。把 runtime 指令构造函数导出，并在安全基础指令和会话上下文之间插入场景说明；将 `pageContext` 纳入 runtime effect 依赖，使切换页面时新实例使用新场景。

- [ ] **Step 4: 重新运行前台单元测试。**

Run: `pnpm --filter @interview-agent/user-portal test -- user-agent-page-context.test.ts user-agent-runtime.test.ts user-agent-quick-actions.test.ts`

Expected: PASS。

### Task 3: 后台场景化快捷入口与运行时上下文

**Files:**
- Modify: `apps/admin-console/src/components/AdminShell.tsx`
- Modify: `apps/admin-console/src/components/admin-agent/AdminAgentWidget.tsx`
- Modify: `apps/admin-console/src/components/admin-agent/AdminAgentDrawer.tsx`
- Modify: `apps/admin-console/src/components/admin-agent/admin-agent-runtime.ts`
- Modify: `apps/admin-console/src/components/admin-agent/useAdminAgentRuntime.ts`
- Modify: `apps/admin-console/src/components/admin-agent/admin-agent-quick-actions.ts`
- Modify: `apps/admin-console/src/components/admin-agent/admin-agent-runtime-context.test.ts`

**Interfaces:**
- `AdminShell` passes its existing `activeView` to `AdminAgentWidget`.
- Widget resolves `AdminAgentPageContext` from `activeView` and authenticated role.
- Drawer receives the context; `QuickActionIcon` accepts generic action identifiers and has a safe fallback icon.
- `buildAdminAgentInstructions(conversationContext?, pageContext?)` preserves the existing security instructions and appends context.

- [ ] **Step 1: 追加失败的后台 runtime 测试。**

```ts
expect(buildAdminAgentInstructions(undefined, '当前在审核工作台，只解释和定位。'))
  .toContain('当前在审核工作台，只解释和定位。');
expect(buildAdminAgentInstructions(undefined, '当前在审核工作台。')).toContain('审核、发布、停用账号');
```

- [ ] **Step 2: 运行聚焦测试并确认导出函数不存在。**

Run: `pnpm --filter @interview-agent/admin-console test -- admin-agent-runtime-context.test.ts`

Expected: FAIL，报 `buildAdminAgentInstructions` 未导出。

- [ ] **Step 3: 接入后台上下文。**

将已有 `activeView` 自 `AdminShell` 传入 Widget，按角色计算 context，传递到 Drawer/runtime。空会话卡片随当前后台页面变化；运行时场景切换时重建实例以避免复用旧系统指令。保持既有模型设置、会话持久化、确认提示和 Admin 页面访问权限行为。

- [ ] **Step 4: 重新运行后台单元测试。**

Run: `pnpm --filter @interview-agent/admin-console test -- admin-agent-page-context.test.ts admin-agent-runtime-context.test.ts admin-agent-quick-actions.test.ts`

Expected: PASS。

### Task 4: 集成质量验证

**Files:**
- Modify only when test or type failures identify an in-scope integration defect.

- [ ] **Step 1: 运行两个前端包的 lint 和 typecheck。**

Run: `pnpm --filter @interview-agent/user-portal lint && pnpm --filter @interview-agent/user-portal typecheck && pnpm --filter @interview-agent/admin-console lint && pnpm --filter @interview-agent/admin-console typecheck`

Expected: PASS。

- [ ] **Step 2: 运行两个前端包的完整单元测试与构建。**

Run: `pnpm --filter @interview-agent/user-portal test && pnpm --filter @interview-agent/admin-console test && pnpm --filter @interview-agent/user-portal build && pnpm --filter @interview-agent/admin-console build`

Expected: PASS。

- [ ] **Step 3: 运行本地页面交互检查。**

验证路径：用户端练习页面 -> 打开 AI 教练 -> 空会话显示练习场景动作；后台审核工作台 -> 打开运营助手 -> 空会话显示审核场景动作。检查页面非空、无框架错误、无相关控制台错误、按钮可点击且不出现自动写操作。

- [ ] **Step 4: 检查改动边界。**

Run: `git diff --check -- apps/user-portal/src/components/user-agent apps/admin-console/src/components/admin-agent apps/admin-console/src/components/AdminShell.tsx docs/superpowers`

Expected: PASS。

## 执行状态（2026-07-21）

- [x] 前后台场景规则、运行时提示注入与定向测试。
- [x] 前后台空会话快捷入口与当前场景说明。
- [x] 前后台 lint、typecheck、完整单测、生产构建与差异检查。
- [ ] 已登录用户端练习页和后台审核工作台的浏览器交互检查：独立预览可渲染且无控制台错误，但当前环境未登录；未输入账号凭证。
