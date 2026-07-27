# Practice Solution Single-flight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent duplicate reference-solution requests and competing busy-state updates from rapid reveal actions.

**Architecture:** A stable per-player exclusive runner wraps the complete solution-loading command and ignores overlapping callers.

**Tech Stack:** React 18, TypeScript 5, Vitest, existing Practice solution API

## Global Constraints

- At most one solution request may execute at a time per mounted player.
- Ignored reveals produce no state, API, notification, or error effect.
- Fulfillment and rejection release the lock for retry.
- Existing solution merge and error semantics remain unchanged.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Solution exclusive runner

**Files:**

- Create: `apps/user-portal/src/components/practice/player/practice-solution-single-flight.ts`
- Create: `apps/user-portal/src/components/practice/player/practice-solution-single-flight.test.ts`

- [x] **Step 1: Write duplicate/conflicting request, retry, and rejection-unlock tests**
- [x] **Step 2: Run focused test and confirm RED because the module is absent**
- [x] **Step 3: Implement the synchronous exclusive runner**
- [x] **Step 4: Re-run and confirm runner tests GREEN**

### Task 2: Reveal hook integration

**Files:**

- Modify: `apps/user-portal/src/components/practice/player/practice-player-actions.ts`

- [x] **Step 1: Create one stable runner in `useRevealPracticeSolution`**
- [x] **Step 2: Wrap session validation and all reveal effects inside the runner**
- [x] **Step 3: Preserve current solution merge and error handling**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused practice tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- RED: focused Vitest failed because `practice-solution-single-flight` did not exist.
- GREEN: runner test passed (`1` file, `2` tests).
- Focused regression: passed (`5` files, `25` tests).
- ESLint: passed.
- TypeScript: passed.
- Full User Portal Vitest: passed (`76` files, `243` tests).
- Production build: passed; Next.js generated `14` static pages.
- Prettier check: passed for the implementation, tests, design, and plan.
- `git diff --check`: passed with no output.
