# AI Usage Latest-request Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep AI usage period loads latest-owned even when an aborted transport resolves late.

**Architecture:** A settings-local manager combines abort with monotonic completion ownership.

**Tech Stack:** React 18, TypeScript 5, Vitest, existing AI Usage API

## Global Constraints

- Preserve existing period selection, summary UI, API, and error behavior.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: AI usage request manager

**Files:**

- Create: `apps/user-portal/src/components/settings/ai-usage-request.ts`
- Create: `apps/user-portal/src/components/settings/ai-usage-request.test.ts`

- [x] **Step 1: Write supersession, current error, and invalidation tests**
- [x] **Step 2: Run focused test and confirm RED because the manager is absent**
- [x] **Step 3: Implement abort plus monotonic ownership**
- [x] **Step 4: Re-run and confirm manager tests GREEN**

### Task 2: Usage hook integration

**Files:**

- Modify: `apps/user-portal/src/components/settings/AiUsageSummary.tsx`

- [x] **Step 1: Create one stable request manager**
- [x] **Step 2: Route state transitions through current-only handlers**
- [x] **Step 3: Invalidate and abort from effect cleanup**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused settings tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- RED: focused test failed because `ai-usage-request` did not exist, as expected.
- GREEN: request manager and usage summary passed 2 files, 4 tests.
- Prettier: implementation, tests, design, and plan passed.
- ESLint: User Portal passed.
- TypeScript: User Portal passed.
- Full Vitest: 95 files, 292 tests passed.
- Production build: Next.js build passed and generated 14 static pages.
- Final diff: `git diff --check` passed; reviewed request ownership, hook integration, tests,
  design, and plan.
