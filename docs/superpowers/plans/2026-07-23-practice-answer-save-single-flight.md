# Practice Answer Save Single-flight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent duplicate answer saves and competing follow-up navigation from rapid save actions.

**Architecture:** A boolean-aware exclusive runner wraps the existing save command and returns false to ignored callers.

**Tech Stack:** React 18, TypeScript 5, Vitest, existing Practice answer API

## Global Constraints

- At most one save action may execute at a time per mounted player.
- Ignored saves resolve false and produce no state, API, storage, notification, or navigation effect.
- The owner forwards its boolean result; rejection releases the lock.
- Existing validation, error handling, local draft cleanup, and notifications remain unchanged.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Save exclusive runner

**Files:**

- Create: `apps/user-portal/src/components/practice/player/practice-save-single-flight.ts`
- Create: `apps/user-portal/src/components/practice/player/practice-save-single-flight.test.ts`

**Interface:**

```ts
export function createExclusivePracticeSaveRunner(): (
  action: () => Promise<boolean>,
) => Promise<boolean>;
```

- [x] **Step 1: Write concurrent, result-forwarding, retry, and rejection-unlock tests**
- [x] **Step 2: Run focused test and confirm RED because the module is absent**
- [x] **Step 3: Implement synchronous lock and boolean forwarding**
- [x] **Step 4: Re-run and confirm runner tests GREEN**

### Task 2: Save hook integration

**Files:**

- Modify: `apps/user-portal/src/components/practice/player/practice-player-actions.ts`

- [x] **Step 1: Create one stable runner in `useSavePracticeAnswer`**
- [x] **Step 2: Wrap validation and all save effects inside the runner**
- [x] **Step 3: Preserve true on success and false on validation/API failure**
- [x] **Step 4: Preserve navigation helpers' existing boolean contract**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused practice tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- RED: focused Vitest failed because `practice-save-single-flight` did not exist.
- GREEN: runner test passed (`1` file, `2` tests).
- Focused regression: passed (`6` files, `32` tests).
- ESLint: passed.
- TypeScript: passed.
- Full User Portal Vitest: passed (`75` files, `241` tests).
- Production build: passed; Next.js generated `14` static pages.
- Prettier check: passed for the implementation, tests, design, and plan.
- `git diff --check`: passed with no output.
