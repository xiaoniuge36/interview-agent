# Home Recommendation Start Single-flight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent duplicate Home recommendation sessions and keep successful navigation transitions locked.

**Architecture:** A stable per-hook exclusive runner wraps a testable Home recommendation start workflow.

**Tech Stack:** React 18, TypeScript 5, Vitest, existing Practice API

## Global Constraints

- At most one recommendation session may be created at a time per mounted Home hook.
- Ignored calls produce no busy state, API, notification, or navigation effect.
- Success keeps the busy id while navigation takes over; failure clears it for retry.
- Existing payload, notification, and route behavior remains unchanged.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Recommendation start model

**Files:**

- Create: `apps/user-portal/src/components/home/question-hub/home-recommendation-start.ts`
- Create: `apps/user-portal/src/components/home/question-hub/home-recommendation-start.test.ts`

- [x] **Step 1: Write runner and workflow ownership/state tests**
- [x] **Step 2: Run focused test and confirm RED because the module is absent**
- [x] **Step 3: Implement runner and recommendation start workflow**
- [x] **Step 4: Re-run and confirm model tests GREEN**

### Task 2: Home hook integration

**Files:**

- Modify: `apps/user-portal/src/components/home/question-hub/useQuestionHubData.ts`

- [x] **Step 1: Create one stable runner in `useRecommendationStarter`**
- [x] **Step 2: Wrap all start effects inside the runner-owned workflow**
- [x] **Step 3: Replace success `finally` unlock with failure-only unlock**
- [x] **Step 4: Preserve notification and route behavior**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused Home tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- RED: focused Vitest failed because `home-recommendation-start` did not exist.
- GREEN: recommendation start model passed (`1` file, `4` tests).
- Focused Home regression: passed (`4` files, `14` tests).
- ESLint: passed.
- TypeScript: passed.
- Full User Portal Vitest: passed (`78` files, `251` tests).
- Production build: passed; Next.js generated `14` static pages.
- Prettier check: passed for the implementation, tests, design, and plan.
- `git diff --check`: passed with no output.
