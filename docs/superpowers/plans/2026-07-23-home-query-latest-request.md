# Home Query Latest-request Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure Home query retries are latest-wins and cannot publish state after unmount.

**Architecture:** Three independent monotonic request runners isolate catalog, recommendation, and continuation lifecycles.

**Tech Stack:** React 18, TypeScript 5, Vitest, existing Home APIs

## Global Constraints

- Only the latest request in each query lane may publish success, error, or settlement state.
- Catalog, recommendation, and continuation lanes remain independent.
- Unmount invalidates all in-flight handlers.
- Existing request payloads and UI copy remain unchanged.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Home latest-request model

**Files:**

- Create: `apps/user-portal/src/components/home/question-hub/home-query-request.ts`
- Create: `apps/user-portal/src/components/home/question-hub/home-query-request.test.ts`

- [x] **Step 1: Write success/error order and invalidation tests**
- [x] **Step 2: Run focused test and confirm RED because the module is absent**
- [x] **Step 3: Implement the generic monotonic runner**
- [x] **Step 4: Re-run and confirm runner tests GREEN**

### Task 2: Home query integration

**Files:**

- Modify: `apps/user-portal/src/components/home/question-hub/useQuestionHubData.ts`

- [x] **Step 1: Create stable catalog, recommendation, and continuation runners**
- [x] **Step 2: Route all query response effects through their lane**
- [x] **Step 3: Replace the continuation-only active flag with unified invalidation cleanup**
- [x] **Step 4: Preserve retry APIs and loading/error copy**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused Home tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- RED: focused Vitest failed because `home-query-request` did not exist.
- GREEN: latest-request model passed (`1` file, `4` tests).
- Focused Home regression: passed (`5` files, `18` tests).
- ESLint: passed after extracting query lifecycle to keep every function within `50` lines.
- TypeScript: passed after preserving the continuation loader's nullable result type.
- Full User Portal Vitest: passed (`80` files, `257` tests).
- Production build: passed; Next.js generated `14` static pages.
- Prettier check: passed for the implementation, tests, design, and plan.
- `git diff --check`: passed with no output.
