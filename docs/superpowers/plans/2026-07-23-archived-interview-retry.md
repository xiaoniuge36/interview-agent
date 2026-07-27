# Archived Interview Retry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users retry a failed archived interview restore without creating a new session.

**Architecture:** The restore hook exposes a retry nonce/failure state; a pure toolbar model selects restore, retry, start, or restart behavior.

**Tech Stack:** React 18, TypeScript 5, Vitest, existing Interview APIs

## Global Constraints

- Retry reloads the same URL session id.
- Pending restore cannot trigger a new interview start.
- Stale response cleanup and existing stream/report behavior remain unchanged.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Recovery control model

**Files:**

- Create: `apps/user-portal/src/components/interview/archived-interview-control.ts`
- Create: `apps/user-portal/src/components/interview/archived-interview-control.test.ts`

- [x] **Step 1: Write pending, failed, start, and restart control tests**
- [x] **Step 2: Run focused test and confirm RED because the module is absent**
- [x] **Step 3: Implement the deterministic control model**
- [x] **Step 4: Re-run and confirm model tests GREEN**

### Task 2: Restore lifecycle and toolbar integration

**Files:**

- Modify: `apps/user-portal/src/hooks/useArchivedInterview.ts`
- Modify: `apps/user-portal/src/hooks/useInterviewController.ts`
- Modify: `apps/user-portal/src/components/interview/InterviewToolbar.tsx`

- [x] **Step 1: Replace loaded-id suppression with retry nonce and failed-session tracking**
- [x] **Step 2: Expose retry/failure/target state through the controller**
- [x] **Step 3: Route the toolbar through the recovery control model**
- [x] **Step 4: Preserve start/restart behavior outside archive recovery**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused Interview tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- RED: focused Vitest failed because `archived-interview-control` did not exist.
- GREEN: recovery control model passed (`1` file, `4` tests).
- Focused Interview regression: passed (`6` files, `18` tests).
- ESLint: passed after keeping the controller within the `50`-line function gate.
- TypeScript: passed.
- Full User Portal Vitest: passed (`82` files, `263` tests).
- Production build: passed; Next.js generated `14` static pages.
- Prettier check: passed for the implementation, tests, design, and plan.
- `git diff --check`: passed with no output.
