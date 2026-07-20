# 管理端 AI 助手多会话 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为现有后台 AI 助手增加账号隔离的持久化多会话、历史管理和 GPT 风格工作区。

**Architecture:** Product API 使用 Prisma 会话/消息模型和 `/admin/page-agent/conversations` REST 接口；管理端用一个会话数据 hook 管理列表、消息和 CRUD，并让每个会话拥有独立的 PageAgentCore 实例。只持久化用户输入、最终回复和错误提示，不持久化 DOM、密钥或内部工具上下文。

**Tech Stack:** NestJS、Prisma/PostgreSQL、Zod、React、Ant Design、PageAgentCore、Vitest、Jest。

## Global Constraints

- 会话查询必须同时约束 `tenantId` 和 `context.actor.id`。
- 敏感操作（审核、发布、导出、账号修改）仍由用户手动确认，不增加快捷写操作。
- 不把 API Key、Token、页面 DOM 或原始工具参数写入会话消息。
- 所有数据库迁移放在 `apps/product-api/prisma/schema/migrations/`。
- 保留工作区中无关的既有未提交改动，不执行 reset、checkout 或全仓格式化。

---

### Task 1: 会话数据模型与 API 契约

**Files:**

- Create: `apps/product-api/prisma/schema/admin-page-agent.prisma`
- Create: `apps/product-api/prisma/schema/migrations/20260720130000_add_admin_page_agent_conversations/migration.sql`
- Modify: `apps/product-api/prisma/schema/identity.prisma`
- Modify: `apps/product-api/prisma/schema/enums.prisma`
- Modify: `apps/product-api/src/modules/admin/admin-page-agent.schemas.ts`
- Modify: `apps/product-api/src/modules/admin/admin-page-agent.controller.ts`
- Modify: `apps/product-api/src/modules/admin/admin.module.ts`
- Test: `apps/product-api/src/modules/admin/admin-page-agent-conversation.service.spec.ts`

**Interfaces:**

- `AdminPageAgentConversationService.list(context): Promise<ConversationSummary[]>`
- `create(context, title?): Promise<ConversationSummary>`
- `get(context, id): Promise<ConversationWithMessages>`
- `rename(context, id, title): Promise<ConversationSummary>`
- `remove(context, id): Promise<null>`
- `appendMessages(context, id, messages): Promise<ConversationWithMessages>`

- [ ] **Step 1: Write failing service tests** for tenant/actor scoping, default title, first-message title update, max content length, and not-found behavior.
- [ ] **Step 2: Run the focused Jest file** with `pnpm --filter @interview-agent/product-api exec jest src/modules/admin/admin-page-agent-conversation.service.spec.ts --runInBand`; expect missing service/model failures.
- [ ] **Step 3: Add Prisma models and migration** with `AdminPageAgentMessageRole` values `user`, `assistant`, `error`, composite tenant relations, indexes on `(tenantId,userId,updatedAt)` and `(tenantId,conversationId,createdAt)`, and cascade delete from conversation to messages.
- [ ] **Step 4: Implement service, schemas, controller routes and module wiring**; validate title at 80 characters, message content at 20,000 characters, and always scope by tenant and actor.
- [ ] **Step 5: Run `pnpm db:validate` and `pnpm --filter @interview-agent/product-api db:generate`**, then rerun the focused Jest file and expect all conversation tests to pass.

### Task 2: 管理端 API 客户端与会话状态

**Files:**

- Create: `apps/admin-console/src/lib/admin-page-agent-conversation-api.ts`
- Create: `apps/admin-console/src/components/admin-agent/useAdminAgentConversations.ts`
- Test: `apps/admin-console/src/lib/admin-page-agent-conversation-api.test.ts`
- Test: `apps/admin-console/src/components/admin-agent/useAdminAgentConversations.test.ts`

**Interfaces:**

- `listAdminAgentConversations(signal?)`
- `createAdminAgentConversation(title?)`
- `getAdminAgentConversation(id, signal?)`
- `renameAdminAgentConversation(id, title)`
- `deleteAdminAgentConversation(id)`
- `appendAdminAgentMessages(id, messages)`

- [ ] **Step 1: Write failing API contract tests** for paths, HTTP methods, request bodies, and Zod response parsing.
- [ ] **Step 2: Run the focused Vitest files** and confirm failures because the client module and hook are absent.
- [ ] **Step 3: Implement the typed API client** on top of `adminRequest`, including schemas for summaries, messages, and detail responses.
- [ ] **Step 4: Implement the conversation hook** with initial load, active id, create/switch/rename/delete, search filtering, and an optimistic local message update followed by API persistence.
- [ ] **Step 5: Rerun the focused Vitest files** and expect all API and state tests to pass.

### Task 3: GPT 风格历史侧栏与聊天工作区

**Files:**

- Modify: `apps/admin-console/src/components/admin-agent/AdminAgentWidget.tsx`
- Modify: `apps/admin-console/src/components/admin-agent/AdminAgentDrawer.tsx`
- Modify: `apps/admin-console/src/components/admin-agent/useAdminAgentConversation.ts`
- Modify: `apps/admin-console/src/components/admin-agent/useAdminAgentRuntime.ts`
- Modify: `apps/admin-console/src/app/styles/admin-agent.css`
- Create: `apps/admin-console/src/components/admin-agent/AdminAgentConversationSidebar.tsx`
- Test: `apps/admin-console/src/components/admin-agent/AdminAgentConversationSidebar.test.tsx`

**Interfaces:**

- `AdminAgentConversationSidebar` receives summaries, active id, loading state, and callbacks for create/select/rename/delete.
- `useAdminAgentConversation` receives the active conversation and an agent factory, returns messages plus submit/stop/answer/reset actions.

- [ ] **Step 1: Write failing sidebar tests** for new-chat callback, search filtering, active state, rename action and delete confirmation callback.
- [ ] **Step 2: Run the focused sidebar test** and confirm it fails because the new sidebar is absent.
- [ ] **Step 3: Implement the sidebar** with compact Ant Design controls, accessible labels, truncated titles, relative update time, and an empty state that directs to “新建对话”.
- [ ] **Step 4: Split Drawer into sidebar and main chat layout**; preserve quick actions, model settings, confirmation alert, token row and composer, while adding retry/error copy for failed persistence.
- [ ] **Step 5: Make runtime instances conversation-scoped**; stop before switching, preserve instances during the page lifecycle, and create a fresh instance for new conversations.
- [ ] **Step 6: Rerun sidebar and existing Admin Agent tests** and expect all to pass.

### Task 4: Integration validation

**Files:**

- Modify: `apps/admin-console/src/components/admin-agent/admin-agent-runtime.ts`
- Modify: `apps/product-api/src/modules/admin/admin-page-agent.service.spec.ts` only if shared fixtures require conversation context.

- [ ] **Step 1: Run `pnpm --filter @interview-agent/admin-console lint` and `pnpm --filter @interview-agent/admin-console typecheck`.**
- [ ] **Step 2: Run `pnpm --filter @interview-agent/admin-console test`.**
- [ ] **Step 3: Run `pnpm --filter @interview-agent/admin-console build`.**
- [ ] **Step 4: Run Product API lint, typecheck, and focused conversation Jest tests.**
- [ ] **Step 5: Run `pnpm db:validate` and `pnpm contracts:check`, inspect `git diff --check`, and report any environment-limited checks without claiming them as passed.**
