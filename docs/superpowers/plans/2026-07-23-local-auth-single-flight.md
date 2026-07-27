# Local Auth Single-flight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent duplicate local login and registration requests.

**Architecture:** A stable auth-feature runner synchronously owns one valid authentication action.

**Tech Stack:** React 18, TypeScript 5, Vitest, existing auth-client

## Global Constraints

- Preserve validation, auth payloads, auth-client state ownership, and retry behavior.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Access action runner

**Files:**

- Create: `apps/user-portal/src/components/auth/access-action-single-flight.ts`
- Create: `apps/user-portal/src/components/auth/access-action-single-flight.test.ts`

- [x] **Step 1: Write duplicate suppression and retry tests**
- [x] **Step 2: Run focused test and confirm RED because the runner is absent**
- [x] **Step 3: Implement synchronous exclusion with `finally` unlock**
- [x] **Step 4: Re-run and confirm the runner test GREEN**

### Task 2: Local access integration

**Files:**

- Modify: `apps/user-portal/src/components/auth/LocalAccessScreen.tsx`

- [x] **Step 1: Create one stable runner in `useLocalAccess`**
- [x] **Step 2: Route login and registration through the runner**
- [x] **Step 3: Preserve validation and auth loading UI**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused auth tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- RED: focused test failed because `access-action-single-flight` did not exist, as expected.
- GREEN: action runner 1 file, 2 tests passed.
- Focused regression: 3 auth files, 5 tests passed.
- Prettier: implementation, tests, design, and plan passed.
- ESLint: User Portal passed.
- TypeScript: User Portal passed.
- Full Vitest: 89 files, 281 tests passed.
- Production build: Next.js build passed and generated 14 static pages.
- Final diff: `git diff --check` passed; reviewed the access hook, runner, tests, design, and plan.
