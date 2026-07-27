# Interview Draft Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在当前浏览器标签页内恢复模拟面试未提交回答，并在提交成功后清除。

**Architecture:** 新增无框架依赖的 sessionStorage helper；`useInterviewDraft` 负责按 session 恢复、编辑写入和成功清除；`useInterviewActions` 隔离开始/提交命令；AnswerComposer 无需感知存储实现。

**Tech Stack:** React 18、Next.js 15、TypeScript 5、Vitest

## Global Constraints

- 只使用 `sessionStorage`，不上传、不长期保存；按 session id 隔离。
- 空白不保存，成功提交删除，失败保留。
- 不修改共享契约、Prisma schema、迁移、根配置、依赖或 CI。
- 函数不超过 50 行、文件不超过 300 行、嵌套不超过 3 层、位置参数不超过 3 个、圈复杂度不超过 10。
- 本会话不执行 commit、push 或 PR。

---

### Task 1: 草稿存储 helper

**Files:**

- Create: `apps/user-portal/src/lib/interview-draft.ts`
- Create: `apps/user-portal/src/lib/interview-draft.test.ts`

- [x] **Step 1: 写失败测试**

覆盖按 session 隔离、空白删除、清除和无浏览器环境。

- [x] **Step 2: 运行测试确认 RED**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/lib/interview-draft.test.ts`  
Expected: FAIL，模块不存在。

- [x] **Step 3: 实现 helper**

```ts
export function loadInterviewDraft(sessionId: string, storage = browserSessionStorage());
export function saveInterviewDraft(
  sessionId: string,
  draft: string,
  storage = browserSessionStorage(),
);
export function clearInterviewDraft(sessionId: string, storage = browserSessionStorage());
```

- [x] **Step 4: 运行测试确认 GREEN**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/lib/interview-draft.test.ts`  
Expected: PASS。

### Task 2: 控制器恢复、写入和清除

**Files:**

- Modify: `apps/user-portal/src/hooks/useInterviewController.ts`
- Modify: `apps/user-portal/src/components/interview/InterviewAnswerComposer.test.tsx`

- [x] **Step 1: 写失败测试锁定恢复提示**

```tsx
expect(renderComposer({ draft: '已恢复回答', draftRecovered: true })).toContain(
  '已恢复当前标签页草稿',
);
```

- [x] **Step 2: 在 controller 注册恢复 effect，并让 `setDraft` 同步保存**

```ts
const draftSessionId = state.session?.id ?? restoredSessionId;
useEffect(() => {
  if (!draftSessionId || state.draft) return;
  const restored = loadInterviewDraft(draftSessionId);
  if (restored) dispatch({ type: 'draft', draft: restored });
}, [draftSessionId, state.draft]);
```

`setDraft` 在 dispatch 后调用 `saveInterviewDraft`，并把 `draftRecovered` 设回 false。

- [x] **Step 3: 成功提交清除 session 草稿，失败路径不清除**

向 `AnswerContext` 传入 `clearDraft(sessionId)`；只在 `answerInterviewStream` 成功后、内存 draft 清空前调用。

- [x] **Step 4: 运行 interview 与 draft 定向测试确认 GREEN**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/lib/interview-draft.test.ts src/components/interview/InterviewAnswerComposer.test.tsx src/components/interview/interview-state.test.ts`  
Expected: PASS。

### Task 3: 用户端完整门禁

- [x] **Step 1: Prettier 与 `git diff --check`**
- [x] **Step 2: ESLint 与完整 Vitest**
- [x] **Step 3: TypeScript 与 Next.js 生产构建**
- [x] **Step 4: 最终 diff 审查并记录证据**

## Verification Evidence

- RED：helper 测试因 `Cannot find module './interview-draft'` 失败；恢复提示测试因缺少“已恢复当前标签页草稿”失败；存储异常测试因 `storage blocked` 失败。
- 定向 GREEN：3 个测试文件、10 项测试通过。
- 完整 Vitest：55 个测试文件、152 项测试通过。
- ESLint、TypeScript、Next.js 生产构建通过；构建生成 14 个静态页面。
- Prettier 已执行；相关生产文件均不超过 300 行，函数门禁由 ESLint 验证。
