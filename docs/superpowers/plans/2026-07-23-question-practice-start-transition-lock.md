# Question Practice Start Transition Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep Question Picker start controls locked after session creation until route navigation replaces the page.

**Architecture:** Extend the existing start model with a workflow that separates success transition state from retryable failure state.

**Tech Stack:** React 18, TypeScript 5, Vitest, existing Practice API

## Global Constraints

- Existing single-flight mutual exclusion remains intact.
- Success retains `busyKey`; failure clears it for retry.
- Session payload, notifications, errors, and route targets remain unchanged.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Start transition workflow

**Files:**

- Modify: `apps/user-portal/src/components/questions/practice-start-single-flight.ts`
- Create: `apps/user-portal/src/components/questions/practice-start-transition.test.ts`

- [x] **Step 1: Write success-lock and failure-unlock workflow tests**
- [x] **Step 2: Run focused test and confirm RED because the workflow export is absent**
- [x] **Step 3: Implement the typed workflow**
- [x] **Step 4: Re-run and confirm workflow tests GREEN**

### Task 2: Question Picker integration

**Files:**

- Modify: `apps/user-portal/src/components/questions/useQuestionPicker.ts`

- [x] **Step 1: Delegate state/API ownership to the workflow inside the existing runner**
- [x] **Step 2: Remove unconditional `finally` busy-key clearing**
- [x] **Step 3: Preserve success/error notifications and navigation**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused Question Picker tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- RED: both focused tests failed because `startQuestionPractice` was not exported.
- GREEN: transition workflow passed (`1` file, `2` tests).
- Focused Question Picker regression: passed (`5` files, `17` tests).
- ESLint: passed.
- TypeScript: passed.
- Full User Portal Vitest: passed (`79` files, `253` tests).
- Production build: passed; Next.js generated `14` static pages.
- Prettier check: passed for the implementation, tests, design, and plan.
- `git diff --check`: passed with no output.
