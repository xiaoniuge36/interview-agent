# User Agent Runtime Initialization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface current runtime initialization failures and prevent stale runtime promises from causing unhandled rejections or resource leaks.

**Architecture:** A pure creation lifecycle helper owns settlement routing. The runtime hook exposes a local error that the existing drawer notice channel displays.

**Tech Stack:** React 18, TypeScript 5, Vitest, Page Agent Core

## Global Constraints

- Runtime creation Promise rejection must never escape unhandled.
- A disposed success must dispose the newly created runtime instead of publishing it.
- A disposed failure must not replace current UI error state.
- Current Error messages are preserved; non-Error failures use `无法启动 AI 刷题教练。`.
- Drawer precedence is conversation error, runtime error, then configuration error.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Runtime creation lifecycle

**Files:**

- Create: `apps/user-portal/src/components/user-agent/runtime-creation.ts`
- Create: `apps/user-portal/src/components/user-agent/runtime-creation.test.ts`

**Interface:**

```ts
export async function runRuntimeCreation<T>(input: {
  create: () => Promise<T>;
  fallbackMessage: string;
  isDisposed: () => boolean;
  onDispose: (runtime: T) => void;
  onError: (message: string) => void;
  onReady: (runtime: T) => void;
}): Promise<boolean>;
```

- [x] **Step 1: Write tests for current/disposed success and failure branches**
- [x] **Step 2: Run focused test and confirm RED because the module is absent**
- [x] **Step 3: Implement guarded try/catch settlement**
- [x] **Step 4: Re-run and confirm lifecycle tests GREEN**

### Task 2: Hook and drawer integration

**Files:**

- Modify: `apps/user-portal/src/components/user-agent/useUserAgentRuntime.ts`
- Modify: `apps/user-portal/src/components/user-agent/UserAgentWidget.tsx`

- [x] **Step 1: Add runtime error state and clear it for each new lifecycle**
- [x] **Step 2: Route creation through `runRuntimeCreation`**
- [x] **Step 3: Preserve current disposal and status-reset behavior**
- [x] **Step 4: Add runtime error to drawer notice precedence**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused User Agent tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- TDD RED：首次运行因 `runtime-creation` 模块不存在而失败，退出码 1。
- Lifecycle GREEN：1 个测试文件、5 项测试通过。
- ESLint 首次发现主 hook 57 行；提取 options、latest ref、telemetry 后又发现依赖 warning；补齐稳定依赖后最新运行 0 error / 0 warning。
- 定向回归：9 个测试文件、34 项测试通过。
- TypeScript：退出码 0。
- 完整 Vitest：68 个测试文件、219 项测试通过。
- Next.js 生产构建：退出码 0，14 个静态页面生成。
- Prettier 已执行；`git diff --check` 退出码 0；最终 diff 已复核。
