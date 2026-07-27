# Practice Draft Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在当前浏览器标签页恢复刷题未保存回答和上次题号，并在服务端保存成功后清理本地副本。

**Architecture:** `practice-local-state.ts` 封装容错的 sessionStorage 快照；`practice-player-model.ts` 负责把可信服务端 session 与受限本地状态合并；播放器 hook 和保存动作只调用这两个边界。

**Tech Stack:** React 18、Next.js 15、TypeScript 5、Vitest

## Global Constraints

- 只使用 `sessionStorage`，不上传、不跨标签页同步。
- 服务端是已保存事实源；只恢复本轮真实题目的非空未保存差异。
- 单题保存成功清除该题草稿，失败保留；整轮完成成功清除全部本地状态。
- 不修改共享契约、Prisma schema、迁移、根配置、依赖或 CI。
- 函数不超过 50 行、文件不超过 300 行、嵌套不超过 3 层、位置参数不超过 3 个、圈复杂度不超过 10。
- 本会话不执行 commit、push 或 PR。

---

### Task 1: 本地快照 helper

**Files:**

- Create: `apps/user-portal/src/lib/practice-local-state.ts`
- Create: `apps/user-portal/src/lib/practice-local-state.test.ts`

**Interfaces:**

- Produces: `loadPracticeLocalState`、`savePracticeDraft`、`savePracticeIndex`、`clearPracticeDraft`、`clearPracticeLocalState`。

- [x] **Step 1: 写失败测试**

覆盖 session 隔离、空白删除、损坏 JSON、存储抛错、题号持久化、单题和整轮清除。

- [x] **Step 2: 运行测试确认 RED**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/lib/practice-local-state.test.ts`  
Expected: FAIL，模块不存在。

- [x] **Step 3: 实现最小 helper**

```ts
export type PracticeLocalState = {
  drafts: Record<string, string>;
  currentIndex: number | null;
};

export function loadPracticeLocalState(
  sessionId: string,
  storage?: PracticeLocalStorage | null,
): PracticeLocalState;
export function savePracticeDraft(
  input: { sessionId: string; itemId: string; draft: string },
  storage?: PracticeLocalStorage | null,
): void;
export function savePracticeIndex(
  sessionId: string,
  currentIndex: number,
  storage?: PracticeLocalStorage | null,
): void;
export function clearPracticeDraft(
  sessionId: string,
  itemId: string,
  storage?: PracticeLocalStorage | null,
): void;
export function clearPracticeLocalState(
  sessionId: string,
  storage?: PracticeLocalStorage | null,
): void;
```

- [x] **Step 4: 运行 helper 测试确认 GREEN**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/lib/practice-local-state.test.ts`  
Expected: PASS。

### Task 2: 可信恢复模型

**Files:**

- Modify: `apps/user-portal/src/components/practice/player/practice-player-model.ts`
- Modify: `apps/user-portal/src/components/practice/player/practice-player-model.test.ts`

**Interfaces:**

- Consumes: `PracticeLocalState`。
- Produces: `restorePracticeWorkspace(session, localState)`，返回 `drafts`、`currentIndex`、`recoveredDraftCount`。

- [x] **Step 1: 写失败测试**

断言未知 item 被丢弃、与服务端相同的旧副本不算恢复、未保存差异覆盖界面、合法题号恢复、越界题号回退。

- [x] **Step 2: 运行 model 测试确认 RED**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/components/practice/player/practice-player-model.test.ts`  
Expected: FAIL，`restorePracticeWorkspace` 尚不存在。

- [x] **Step 3: 实现可信合并**

```ts
export function restorePracticeWorkspace(session: PracticeSession, localState: PracticeLocalState) {
  // 仅合并当前 item id 且与服务端答案不同的非空草稿；索引越界时回退。
}
```

- [x] **Step 4: 运行 model 测试确认 GREEN**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/components/practice/player/practice-player-model.test.ts`  
Expected: PASS。

### Task 3: 播放器生命周期接入

**Files:**

- Modify: `apps/user-portal/src/components/practice/player/usePracticePlayer.ts`
- Modify: `apps/user-portal/src/components/practice/player/practice-player-actions.ts`

**Interfaces:**

- Consumes: Task 1 helper 与 Task 2 `restorePracticeWorkspace`。

- [x] **Step 1: 加载时合并快照**

`getPracticeSession` 成功后读取本地状态，通过 `restorePracticeWorkspace` 生成初始 drafts/index；存在恢复草稿时设置页面状态提示。

- [x] **Step 2: 输入和切题时写入**

`updateDraft(itemId, value)` 调用 `savePracticeDraft`；`setCurrentIndex(index)` 调用 `savePracticeIndex`。两者继续同步更新 React state。

- [x] **Step 3: 成功路径清理**

`submitPracticeAnswer` 成功后调用 `clearPracticeDraft(sessionId, itemId)`；AI 复盘或自学完成成功后调用 `clearPracticeLocalState(sessionId)`。所有 catch 路径保持本地状态。

- [x] **Step 4: 运行定向测试**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/lib/practice-local-state.test.ts src/components/practice/player/practice-player-model.test.ts src/components/practice/player/PracticeQuestionStage.test.tsx`  
Expected: PASS。

### Task 4: User Portal 完整门禁

- [x] **Step 1: Prettier 与 `git diff --check`**
- [x] **Step 2: ESLint 与完整 Vitest**
- [x] **Step 3: TypeScript 与 Next.js 生产构建**
- [x] **Step 4: 最终 diff 审查并记录验证证据**

## Verification Evidence

- RED：helper 测试因缺少 `./practice-local-state` 失败；恢复模型测试因函数缺失失败；空白覆盖和已完成练习恢复测试分别出现预期断言失败。
- 定向 GREEN：3 个测试文件、23 项测试通过。
- 完整 Vitest：56 个测试文件、162 项测试通过。
- ESLint、TypeScript、Next.js 生产构建通过；构建生成 14 个静态页面。
- 相关生产文件均少于 300 行；Prettier 与 `git diff --check` 已执行。
