# Model Credential Action Single-flight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent duplicate or conflicting model credential test/remove operations.

**Architecture:** A shared per-card exclusive runner owns both asynchronous credential commands.

**Tech Stack:** React 18, TypeScript 5, Vitest, existing credential APIs

## Global Constraints

- At most one test or remove workflow may execute per mounted credential card.
- Ignored calls produce no confirmation, state, API, notification, or reconciliation effect.
- Existing action results and failure handling remain unchanged.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Credential exclusive runner

**Files:**

- Modify: `apps/user-portal/src/components/settings/model-credential-action.ts`
- Create: `apps/user-portal/src/components/settings/model-credential-action-single-flight.test.ts`

- [x] **Step 1: Write duplicate/conflict, retry, and rejection-unlock tests**
- [x] **Step 2: Run focused test and confirm RED because the runner export is absent**
- [x] **Step 3: Implement the synchronous exclusive runner**
- [x] **Step 4: Re-run and confirm runner tests GREEN**

### Task 2: Credential card integration

**Files:**

- Modify: `apps/user-portal/src/components/settings/ModelCredentialCard.tsx`

- [x] **Step 1: Create one stable runner per card**
- [x] **Step 2: Wrap complete test and remove workflows with the shared runner**
- [x] **Step 3: Move remove confirmation inside runner ownership**
- [x] **Step 4: Extract workflows to preserve function-size gates**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused Settings tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- RED: both focused tests failed because `createExclusiveCredentialActionRunner` was not exported.
- GREEN: runner passed (`1` file, `2` tests).
- Focused Settings regression: passed (`5` files, `14` tests).
- ESLint: passed.
- TypeScript: passed.
- Full User Portal Vitest: passed (`83` files, `266` tests).
- Production build: passed; Next.js generated `14` static pages.
- Prettier check: passed for the implementation, tests, design, and plan.
- `git diff --check`: passed with no output.
