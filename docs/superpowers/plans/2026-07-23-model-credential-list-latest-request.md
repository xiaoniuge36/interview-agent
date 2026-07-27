# Model Credential List Latest-request Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make model credential list refresh latest-wins and safe after unmount.

**Architecture:** A stable monotonic request runner owns all refresh result effects.

**Tech Stack:** React 18, TypeScript 5, Vitest, existing model credential API

## Global Constraints

- Only the latest refresh may publish list, error, or settlement state.
- Unmount invalidates every in-flight handler.
- Existing `Promise<boolean>` refresh contract remains unchanged.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Credential list request model

**Files:**

- Create: `apps/user-portal/src/components/settings/model-credential-list-request.ts`
- Create: `apps/user-portal/src/components/settings/model-credential-list-request.test.ts`

- [x] **Step 1: Write result-order, stale-error, latest-error, and invalidation tests**
- [x] **Step 2: Run focused test and confirm RED because the module is absent**
- [x] **Step 3: Implement the monotonic latest-request runner**
- [x] **Step 4: Re-run and confirm runner tests GREEN**

### Task 2: Panel integration

**Files:**

- Modify: `apps/user-portal/src/components/settings/ModelConnectionsPanel.tsx`

- [x] **Step 1: Create one stable runner in `useConnections`**
- [x] **Step 2: Route list/error/loading effects through the runner**
- [x] **Step 3: Invalidate in the mount effect cleanup**
- [x] **Step 4: Preserve refresh boolean semantics**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused Settings tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- RED: focused Vitest failed because `model-credential-list-request` did not exist.
- GREEN: latest-request runner passed (`1` file, `4` tests).
- Focused Settings regression: passed (`5` files, `17` tests).
- ESLint: passed.
- TypeScript: passed.
- Full User Portal Vitest: passed (`84` files, `270` tests).
- Production build: passed; Next.js generated `14` static pages.
- Prettier check: passed for the implementation, tests, design, and plan.
- `git diff --check`: passed with no output.
