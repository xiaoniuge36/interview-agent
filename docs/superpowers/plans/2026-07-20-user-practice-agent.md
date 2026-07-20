# C 端 AI 刷题教练 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有用户端加入使用个人模型连接、支持历史会话和页面操作的 AI 刷题教练。

**Architecture:** Product API 新增用户专属 Page Agent 模块和独立会话表；User Portal 使用 `PageAgentCore` 与 `PageController` 构建自定义运行时，并以只读工具连接既有练习推荐、掌握度和最近练习 API。所有会话按 `tenantId + userId` 隔离，可能产生模型消耗或业务写入的页面操作由 Agent 发起确认。

**Tech Stack:** Next.js 15、React 18、TypeScript、NestJS 11、Prisma 6、PageAgent、Vitest、Jest。

## Global Constraints

- 不创建新的前台系统，功能只挂载在 `apps/user-portal` 的现有 `UserShell`。
- 不向浏览器返回明文 API Key，不保存 DOM、工具参数和思维过程。
- 新函数不超过 50 行，新文件不超过 300 行，嵌套不超过 3 层。
- 不修改后台 Agent 的会话数据和权限范围。
- 不执行 Git commit、push、reset 或清理其他未提交改动。

---

### Task 1: 用户 Agent 数据模型与 API

**Files:**
- Create: `apps/product-api/prisma/schema/user-page-agent.prisma`
- Create: `apps/product-api/prisma/schema/migrations/20260720143000_add_user_page_agent/migration.sql`
- Create: `apps/product-api/src/modules/user-page-agent/user-page-agent.schemas.ts`
- Create: `apps/product-api/src/modules/user-page-agent/user-page-agent-conversation.service.ts`
- Create: `apps/product-api/src/modules/user-page-agent/user-page-agent-conversation.service.spec.ts`
- Create: `apps/product-api/src/modules/user-page-agent/user-page-agent.service.ts`
- Create: `apps/product-api/src/modules/user-page-agent/user-page-agent.service.spec.ts`
- Create: `apps/product-api/src/modules/user-page-agent/user-page-agent.controller.ts`
- Create: `apps/product-api/src/modules/user-page-agent/user-page-agent.module.ts`
- Modify: `apps/product-api/prisma/schema/enums.prisma`
- Modify: `apps/product-api/prisma/schema/identity.prisma`
- Modify: `apps/product-api/src/app.module.ts`
- Modify: `packages/contracts/src/schemas/ai-usage.ts`
- Modify: `packages/contracts/src/schemas/ai-usage.test.ts`

**Interfaces:**
- Produces: `/user/page-agent/config`、`/chat/completions` 和会话 CRUD API。
- Consumes: `ModelCredentialService.resolveDefault`、`ModelProviderClient.invokeCompatible`、`AiInvocationService.measure`。

- [ ] 先写 Jest 用例，断言会话查询包含 `tenantId + userId`、首条用户消息生成标题、敏感值脱敏、跨用户会话返回 404。
- [ ] 运行 `pnpm exec jest --runInBand src/modules/user-page-agent/*.spec.ts`，确认因模块尚未实现而失败。
- [ ] 添加 Prisma 模型、`user_page_agent` 调用类型、迁移 SQL 和用户 Agent 模块。
- [ ] 实现模型配置、兼容完成代理、会话 CRUD 与消息追加。
- [ ] 重新运行定向 Jest，预期全部通过。

### Task 2: User Portal API、工具和运行时

**Files:**
- Modify: `apps/user-portal/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/user-portal/src/lib/user-page-agent-api.ts`
- Create: `apps/user-portal/src/lib/user-agent-conversation-api.ts`
- Create: `apps/user-portal/src/lib/user-page-agent-api.test.ts`
- Create: `apps/user-portal/src/lib/user-agent-conversation-api.test.ts`
- Create: `apps/user-portal/src/components/user-agent/user-agent-tools.ts`
- Create: `apps/user-portal/src/components/user-agent/user-agent-runtime.ts`
- Create: `apps/user-portal/src/components/user-agent/user-agent-runtime.test.ts`
- Create: `apps/user-portal/src/components/user-agent/user-agent-quick-actions.ts`
- Create: `apps/user-portal/src/components/user-agent/user-agent-quick-actions.test.ts`

**Interfaces:**
- Produces: `createUserAgentRuntime`、`formatUserAgentConversationContext`、只读工具和 API clients。
- Consumes: 用户 Agent 后端 API、现有 `/practice-recommendations`、`/mastery`、`/practices/recent`。

- [ ] 先写 Vitest，覆盖 API 路径、快捷提问内容、上下文只保留最近 12 条且不超过 12000 字符。
- [ ] 运行对应测试并确认因导出不存在而失败。
- [ ] 加入 PageAgent 依赖并实现 API clients。
- [ ] 实现导航、智能题单、掌握度、最近练习只读工具和安全运行时。
- [ ] 重新运行定向 Vitest，预期全部通过。

### Task 3: 多会话状态与 C 端界面

**Files:**
- Create: `apps/user-portal/src/components/user-agent/UserAgentWidget.tsx`
- Create: `apps/user-portal/src/components/user-agent/UserAgentFloatButton.tsx`
- Create: `apps/user-portal/src/components/user-agent/UserAgentDrawer.tsx`
- Create: `apps/user-portal/src/components/user-agent/UserAgentConversationSidebar.tsx`
- Create: `apps/user-portal/src/components/user-agent/UserAgentComposer.tsx`
- Create: `apps/user-portal/src/components/user-agent/useUserAgentConfig.ts`
- Create: `apps/user-portal/src/components/user-agent/useUserAgentConversations.ts`
- Create: `apps/user-portal/src/components/user-agent/useUserAgentConversation.ts`
- Create: `apps/user-portal/src/components/user-agent/useUserAgentRuntime.ts`
- Create: `apps/user-portal/src/components/user-agent/useUserAgentDrag.ts`
- Create: `apps/user-portal/src/app/styles/user-agent.css`
- Modify: `apps/user-portal/src/components/UserShell.tsx`
- Modify: `apps/user-portal/src/app/globals.css`

**Interfaces:**
- Produces: 登录用户全局可用的 AI 刷题教练。
- Consumes: Task 2 的运行时、快捷提问和 API clients。

- [ ] 用纯函数测试锁定拖拽边界、会话上下文和快捷入口文案。
- [ ] 实现配置加载、会话列表、当前消息、停止运行和确认问答 hooks。
- [ ] 实现星环悬浮入口、双栏会话抽屉、模型缺失空状态和移动端布局。
- [ ] 挂载到 `UserShell`，确保 Agent 自身 DOM 标记为不可交互目标。
- [ ] 运行 User Portal 定向测试和类型检查。

### Task 4: 数据库应用与完成验证

**Files:**
- Verify all files listed above.

**Interfaces:**
- Produces: 可在本地真实 API 与 User Portal 中运行的完整闭环。

- [ ] 运行 `pnpm db:validate`、`pnpm db:generate` 和 `pnpm db:migrate:deploy`。
- [ ] 运行 Product API 用户 Agent 定向 Jest 与 TypeScript 检查。
- [ ] 运行 User Portal 全量 Vitest、Lint、TypeScript 检查和 production build。
- [ ] 运行目标文件 Prettier 检查与 `git diff --check`。
- [ ] 检查 `git status --short`，只报告本次新增改动，不覆盖或提交其他工作区内容。

