# Global Search Unmount Invalidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent global search completions from publishing after unmount.

**Architecture:** A feature-local monotonic lifecycle is invalidated by every effect cleanup.

**Tech Stack:** React 18, TypeScript 5, Vitest, existing Question Catalog API

## Global Constraints

- Preserve debounce and query/retry semantics.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Search request lifecycle

**Files:**

- Create: `apps/user-portal/src/components/search/search-request-lifecycle.ts`
- Create: `apps/user-portal/src/components/search/search-request-lifecycle.test.ts`

- [x] **Step 1: Write latest and invalidation tests**
- [x] **Step 2: Run focused test and confirm RED because the lifecycle is absent**
- [x] **Step 3: Implement the monotonic lifecycle**
- [x] **Step 4: Re-run and confirm lifecycle tests GREEN**

### Task 2: Hook cleanup integration

**Files:**

- Modify: `apps/user-portal/src/components/search/useGlobalSearchResults.ts`

- [x] **Step 1: Create one stable lifecycle**
- [x] **Step 2: Use lifecycle versions for query effects**
- [x] **Step 3: Invalidate from timer/request cleanup**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused search tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- RED: focused test failed because `search-request-lifecycle` did not exist, as expected.
- GREEN: lifecycle 1 file, 2 tests passed.
- Focused regression: lifecycle, search model, and trigger passed 3 files, 9 tests.
- Prettier: implementation, tests, design, and plan passed.
- ESLint: User Portal passed.
- TypeScript: User Portal passed.
- Full Vitest: 91 files, 286 tests passed.
- Production build: Next.js build passed and generated 14 static pages.
- Final diff: `git diff --check` passed; reviewed lifecycle, hook cleanup, tests, design, and plan.
