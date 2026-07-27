# Job Submission Single-flight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent duplicate job-intent creation and suppress completion effects after unmount.

**Architecture:** A mounted hook owns one synchronous exclusive runner around the existing API call.

**Tech Stack:** React 18, TypeScript 5, Vitest, existing Workspace API

## Global Constraints

- Preserve validation, notifications, callbacks, and save/save-and-start behavior.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Submission model

**Files:**

- Create: `apps/user-portal/src/components/profile/job-submission-single-flight.ts`
- Create: `apps/user-portal/src/components/profile/job-submission-single-flight.test.ts`

- [x] **Step 1: Write duplicate, retry, and invalidation tests**
- [x] **Step 2: Run the focused test and confirm RED because the helper is absent**
- [x] **Step 3: Implement the synchronous exclusive runner**
- [x] **Step 4: Re-run and confirm the focused test GREEN**

### Task 2: Hook integration

**Files:**

- Modify: `apps/user-portal/src/components/profile/useJobIntentForm.ts`

- [x] **Step 1: Create one stable runner for the mounted hook**
- [x] **Step 2: Route request effects and lock state through runner handlers**
- [x] **Step 3: Invalidate the runner on unmount**
- [x] **Step 4: Preserve validation and action handoff semantics**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused profile/job tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- RED: focused test failed because `job-submission-single-flight` did not exist, as expected.
- GREEN: submission model 1 file, 3 tests passed.
- Focused regression: 3 files, 8 tests passed.
- Prettier: implementation, test, design, and plan files passed.
- ESLint: User Portal passed after reducing all touched functions below repository limits.
- TypeScript: User Portal passed.
- Full Vitest: 87 files, 278 tests passed.
- Production build: Next.js build passed and generated 14 static pages.
- Final diff: `git diff --check` passed; reviewed the hook integration, runner, tests, design,
  and plan.
