# User Agent Conversation Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agent 历史对话重命名/删除失败可见、成功才更新，并防止重复提交和误删除。

**Architecture:** 纯 mutation model 标准化结果；conversation hooks 消费 result 并返回 boolean；Sidebar 用确认与 ref 锁控制交互。

**Tech Stack:** React 18、TypeScript 5、Vitest、现有 Conversation API

## Global Constraints

- rename/delete API reject 不得成为未处理 Promise rejection。
- 失败写入现有 conversation error；成功清除 error 并更新本地 state。
- rename 只有成功才退出编辑；Enter + blur 只能产生一次在途请求。
- delete 必须确认，确认文案包含对话标题；在途期间不重复删除。
- 不修改 API、共享契约、根配置、依赖或 CI。
- 函数不超过 50 行、文件不超过 300 行、嵌套不超过 3 层、位置参数不超过 3 个、圈复杂度不超过 10。
- 本会话不执行 commit、push 或 PR。

---

### Task 1: Conversation mutation model

**Files:**

- Create: `apps/user-portal/src/components/user-agent/conversation-management.ts`
- Create: `apps/user-portal/src/components/user-agent/conversation-management.test.ts`

- [x] **Step 1: 写失败测试**

覆盖成功、Error message、非 Error fallback、确认文案与 confirm true/false。

- [x] **Step 2: 运行测试确认 RED**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/components/user-agent/conversation-management.test.ts`  
Expected: FAIL，模块不存在。

- [x] **Step 3: 实现最小 model**

签名与设计一致；mutation catch 后返回 union，不 throw。

- [x] **Step 4: 运行 model 测试确认 GREEN**

Run: 同 Step 2。  
Expected: PASS。

### Task 2: Hooks 消费显式结果

**Files:**

- Modify: `apps/user-portal/src/components/user-agent/useUserAgentConversations.ts`

- [x] **Step 1: rename 使用 mutation model**

失败 `setError(message)` + return false；成功更新 summary/active、清错、return true。

- [x] **Step 2: delete 使用 mutation model**

失败不改本地列表并 return false；成功执行现有 replacement 逻辑、清错、return true。

### Task 3: Sidebar 确认与防重复

**Files:**

- Modify: `apps/user-portal/src/components/user-agent/UserAgentConversationSidebar.tsx`
- Modify: `apps/user-portal/src/components/user-agent/UserAgentDrawer.tsx`

- [x] **Step 1: callback 改为 Promise<boolean>**

Drawer 与 Sidebar 类型同步；Widget 使用 hook 推断结果，无需适配器。

- [x] **Step 2: rename 成功才关闭**

`pendingRef` 为 true 时直接 return；await boolean；true 才 `setEditing(false)`；finally 解锁。

- [x] **Step 3: delete 确认并防重复**

调用 `confirmConversationDeletion(title, window.confirm)`；取消不请求；确认后复用 pendingRef。

- [x] **Step 4: 运行定向回归**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/components/user-agent/conversation-management.test.ts src/components/user-agent/user-agent-runtime.test.ts src/components/user-agent/user-agent-drawer-presentation.test.ts`  
Expected: PASS。

### Task 4: User Portal 完整门禁

- [x] **Step 1: Prettier 与 `git diff --check`**
- [x] **Step 2: ESLint 与完整 Vitest**
- [x] **Step 3: TypeScript 与 Next.js 生产构建**
- [x] **Step 4: 最终 diff 审查并记录证据**

## Verification Evidence

- TDD RED：新增测试首次运行因 `conversation-management` 模块不存在而失败，符合预期。
- Model GREEN：`conversation-management.test.ts` 的 4 项测试通过。
- 定向回归：3 个测试文件、12 项测试通过。
- ESLint：`pnpm --filter @interview-agent/user-portal lint`，退出码 0。
- TypeScript：`pnpm --filter @interview-agent/user-portal typecheck`，退出码 0。
- 完整 Vitest：62 个测试文件、197 项测试通过。
- Next.js 生产构建：退出码 0，14 个静态页面生成。
- 格式与差异检查：Prettier 已执行；`git diff --check` 退出码 0。
