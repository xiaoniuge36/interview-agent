# Workspace Latest-request Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep Workspace reload latest-owned and prevent state updates after unmount.

**Architecture:** A monotonic handler runner wraps the existing shared in-flight loader.

**Tech Stack:** React 18, TypeScript 5, Vitest, existing Workspace API

## Global Constraints

- Existing physical request sharing remains intact.
- Only the latest reload may publish ready/error state.
- Unmount invalidates every in-flight handler.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Workspace request model

**Files:**

- Modify: `apps/user-portal/src/hooks/useWorkspaceData.ts`
- Create: `apps/user-portal/src/hooks/workspace-request.test.ts`

- [x] **Step 1: Write latest success/error and invalidation tests**
- [x] **Step 2: Run focused test and confirm RED because the runner export is absent**
- [x] **Step 3: Implement the monotonic handler runner**
- [x] **Step 4: Re-run and confirm request tests GREEN**

### Task 2: Hook integration

**Files:**

- Modify: `apps/user-portal/src/hooks/useWorkspaceData.ts`

- [x] **Step 1: Create one stable request runner beside the shared loader**
- [x] **Step 2: Route ready/error effects through the latest runner**
- [x] **Step 3: Invalidate in every mount-effect cleanup path**
- [x] **Step 4: Preserve profile/job local updates and request sharing**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused Workspace tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- RED: `workspace-request.test.ts` 的 3 项测试因 `createLatestWorkspaceRequest` 尚未导出而失败，符合预期。
- GREEN: `workspace-request.test.ts` 1 个文件、3 项测试通过。
- Focused regression: 4 个文件、10 项测试通过。
- ESLint: User Portal 定向检查通过。
- TypeScript: User Portal 类型检查通过。
- Prettier: 本轮源码与测试检查通过。
- Full Vitest: 86 个文件、275 项测试通过。
- Production build: Next.js 构建通过，生成 14 个静态页面。
- Final diff: `git diff --check` 通过；已复核 Workspace runner、hook 集成、测试、设计与计划文件。
