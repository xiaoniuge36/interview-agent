# Question Recommendation Latest-request Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep Question Picker recommendations latest-owned and unmount-safe.

**Architecture:** A small feature adapter normalizes API results and delegates request ownership to the
existing Question latest-request runner.

**Tech Stack:** React 18, TypeScript 5, Vitest, existing Question Catalog API

## Global Constraints

- Preserve current recommendation display, retry, and error behavior.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Recommendation request adapter

**Files:**

- Create: `apps/user-portal/src/components/questions/question-recommendation-request.ts`
- Create: `apps/user-portal/src/components/questions/question-recommendation-request.test.ts`

- [x] **Step 1: Write latest, empty, and invalidation tests**
- [x] **Step 2: Run focused test and confirm RED because the adapter is absent**
- [x] **Step 3: Implement the adapter around the existing runner**
- [x] **Step 4: Re-run and confirm adapter tests GREEN**

### Task 2: Hook integration

**Files:**

- Modify: `apps/user-portal/src/components/questions/useQuestionPicker.ts`

- [x] **Step 1: Create one stable recommendation request adapter**
- [x] **Step 2: Route recommendation state through adapter handlers**
- [x] **Step 3: Invalidate from the recommendation effect cleanup**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused question tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- RED: focused test failed because `question-recommendation-request` did not exist, as expected.
- GREEN: recommendation adapter, Question latest-request, and Banner passed 3 files, 7 tests.
- Prettier: implementation, tests, design, and plan passed.
- ESLint: User Portal passed.
- TypeScript: User Portal passed.
- Full Vitest: 93 files, 289 tests passed.
- Production build: Next.js build passed and generated 14 static pages.
- Final diff: `git diff --check` passed; reviewed the adapter, hook integration, tests, design,
  and plan. Existing Question Picker changes outside the recommendation path were preserved.
