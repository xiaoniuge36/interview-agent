# Session Sign-out Single-flight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure all User Portal sign-out entry points share one in-flight session action.

**Architecture:** A feature-local module singleton delegates to the already-tested auth exclusive runner.

**Tech Stack:** React 18, TypeScript 5, Vitest, existing auth-client

## Global Constraints

- Preserve auth-client state ownership, current buttons, and development-mode behavior.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Shared sign-out action

**Files:**

- Create: `apps/user-portal/src/components/auth/session-sign-out.ts`
- Create: `apps/user-portal/src/components/auth/session-sign-out.test.ts`

- [x] **Step 1: Write duplicate and post-settlement test**
- [x] **Step 2: Run focused test and confirm RED because the shared action is absent**
- [x] **Step 3: Implement one module-level runner**
- [x] **Step 4: Re-run test GREEN**

### Task 2: Entry-point integration

**Files:**

- Modify: `apps/user-portal/src/components/shell/UserTopbarActions.tsx`
- Modify: `apps/user-portal/src/components/settings/SettingsPageContent.tsx`

- [x] **Step 1: Route topbar sign-out through the shared action**
- [x] **Step 2: Route Settings sign-out through the shared action**
- [x] **Step 3: Preserve current props and button behavior**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused auth/shell tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- RED: focused test failed because `session-sign-out` did not exist, as expected.
- GREEN: session sign-out, existing access runner, topbar, and sidebar actions passed 4 files,
  7 tests.
- Prettier: implementation, tests, design, and plan passed.
- ESLint: User Portal passed.
- TypeScript: User Portal passed.
- Full Vitest: 94 files, 290 tests passed.
- Production build: Next.js build passed and generated 14 static pages.
- Final diff: `git diff --check` passed; reviewed the shared action, both entry points, test,
  design, and plan.
