# Federated Auth Single-flight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent duplicate OIDC sign-in redirects from the federated access screen.

**Architecture:** The screen owns one existing auth runner and disables its action while auth is loading.

**Tech Stack:** React 18, TypeScript 5, Vitest, existing auth-client

## Global Constraints

- Preserve auth-client redirect, error, and loading ownership.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Federated access regression test

**Files:**

- Create: `apps/user-portal/src/components/auth/FederatedAccessScreen.test.tsx`

- [x] **Step 1: Add a loading-state button test**
- [x] **Step 2: Run focused test and confirm RED because the button is still enabled**

### Task 2: Single-flight integration

**Files:**

- Modify: `apps/user-portal/src/components/auth/FederatedAccessScreen.tsx`

- [x] **Step 1: Create one stable existing access runner**
- [x] **Step 2: Route button clicks through the runner**
- [x] **Step 3: Disable the button during the loading transition**
- [x] **Step 4: Re-run focused and existing auth runner tests GREEN**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused auth tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- RED: loading-state component test failed because the federated button was enabled.
- GREEN: federated access, existing access runner, and auth transition passed 3 files, 4 tests.
- Prettier: implementation, test, design, and plan passed.
- ESLint: User Portal passed.
- TypeScript: User Portal passed.
- Full Vitest: 92 files, 287 tests passed.
- Production build: Next.js build passed and generated 14 static pages.
- Final diff: `git diff --check` passed; reviewed the federated screen, regression test, design,
  and plan.
