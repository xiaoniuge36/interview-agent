# Reports Weakness Review Single-flight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent duplicate weakness-review sessions from rapid Reports actions.

**Architecture:** A stable per-component exclusive runner wraps the existing domain workflow.

**Tech Stack:** React 18, TypeScript 5, Vitest, existing weakness-review model

## Global Constraints

- At most one weakness-review creation may execute per mounted Reports action.
- Ignored calls produce no loading, API, notification, or navigation effect.
- Existing success lock and failure unlock semantics remain unchanged.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Weakness review runner

**Files:**

- Modify: `apps/user-portal/src/lib/weakness-review.ts`
- Create: `apps/user-portal/src/lib/weakness-review-single-flight.test.ts`

- [x] **Step 1: Write duplicate/retry and rejection-unlock tests**
- [x] **Step 2: Run focused test and confirm RED because the runner export is absent**
- [x] **Step 3: Implement the synchronous exclusive runner**
- [x] **Step 4: Re-run and confirm runner tests GREEN**

### Task 2: Reports action integration

**Files:**

- Modify: `apps/user-portal/src/components/reports/WeaknessReviewAction.tsx`

- [x] **Step 1: Create one stable runner in the action component**
- [x] **Step 2: Wrap the complete existing weakness workflow**
- [x] **Step 3: Preserve button, notification, and navigation behavior**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused weakness/Reports tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- RED: both focused tests failed because `createExclusiveWeaknessReviewRunner` was not exported.
- GREEN: runner passed (`1` file, `2` tests).
- Focused Reports/weakness regression: passed (`5` files, `13` tests).
- ESLint: passed.
- TypeScript: passed.
- Full User Portal Vitest: passed (`81` files, `259` tests).
- Production build: passed; Next.js generated `14` static pages.
- Prettier check: passed for the implementation, tests, design, and plan.
- `git diff --check`: passed with no output.
