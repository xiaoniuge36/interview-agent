# Practice Continuation Single-flight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent duplicate or competing next-practice session creation and keep successful navigation transitions locked.

**Architecture:** A shared per-player exclusive runner wraps both continuation workflows; a testable recommendation workflow owns transition-state semantics.

**Tech Stack:** React 18, TypeScript 5, Vitest, existing Practice and recommendation APIs

## Global Constraints

- At most one continuation session may be created at a time per mounted player.
- Ignored continuation calls produce no loading, API, notification, or navigation effect.
- Successful creation remains visibly locked while navigation takes over; failure unlocks for retry.
- Existing recommendation and weakness-review behavior remains otherwise unchanged.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Continuation model

**Files:**

- Create: `apps/user-portal/src/components/practice/player/practice-continuation.ts`
- Create: `apps/user-portal/src/components/practice/player/practice-continuation.test.ts`

- [x] **Step 1: Write exclusive runner and recommendation workflow tests**
- [x] **Step 2: Run focused test and confirm RED because the module is absent**
- [x] **Step 3: Implement the runner and recommendation workflow**
- [x] **Step 4: Re-run and confirm model tests GREEN**

### Task 2: Completion hook integration

**Files:**

- Modify: `apps/user-portal/src/components/practice/player/usePracticePlayer.ts`

- [x] **Step 1: Create one stable continuation runner in the completion hook**
- [x] **Step 2: Wrap both recommendation and weakness-review creation paths**
- [x] **Step 3: Replace recommendation `finally` unlock with failure-only unlock**
- [x] **Step 4: Preserve payloads, notifications, and route targets**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused continuation/practice tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- RED: focused Vitest failed because `practice-continuation` did not exist.
- GREEN: continuation model passed (`1` file, `4` tests).
- Focused regression: passed (`5` files, `28` tests).
- ESLint: passed after splitting one test suite callback to satisfy the 50-line function gate.
- TypeScript: passed.
- Full User Portal Vitest: passed (`77` files, `247` tests).
- Production build: passed; Next.js generated `14` static pages.
- Prettier check: passed for the implementation, tests, design, and plan.
- `git diff --check`: passed with no output.
