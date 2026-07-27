# Profile Submission Single-flight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent duplicate profile writes and suppress completion effects after unmount.

**Architecture:** Promote the existing feature-local runner and integrate one instance into the profile hook.

**Tech Stack:** React 18, TypeScript 5, Vitest, existing Workspace API

## Global Constraints

- Preserve the existing Job runner export and both form behaviors.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Promote the submission model

**Files:**

- Create: `apps/user-portal/src/components/profile/profile-submission-single-flight.ts`
- Create: `apps/user-portal/src/components/profile/profile-submission-single-flight.test.ts`
- Modify: `apps/user-portal/src/components/profile/job-submission-single-flight.ts`

- [x] **Step 1: Write a focused test against the promoted runner**
- [x] **Step 2: Run it and confirm RED because the promoted module is absent**
- [x] **Step 3: Move the implementation behind the promoted export and preserve the Job alias**
- [x] **Step 4: Re-run promoted and Job runner tests GREEN**

### Task 2: Profile hook integration

**Files:**

- Modify: `apps/user-portal/src/components/profile/useProfileForm.ts`

- [x] **Step 1: Create one stable runner in the mounted hook**
- [x] **Step 2: Route API completion effects and busy state through runner handlers**
- [x] **Step 3: Invalidate the runner on unmount**
- [x] **Step 4: Preserve validation and callback behavior**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused profile tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- RED: focused test failed because `profile-submission-single-flight` did not exist, as expected.
- GREEN/focused regression: promoted runner, Job compatibility suite, and Job UI passed 3 files,
  5 tests.
- Prettier: implementation, tests, design, and plan passed.
- ESLint: User Portal passed.
- TypeScript: User Portal passed.
- Full Vitest: 88 files, 279 tests passed.
- Production build: Next.js build passed and generated 14 static pages.
- Final diff: `git diff --check` passed; reviewed the shared runner, Job alias, Profile hook,
  tests, design, and plan.
