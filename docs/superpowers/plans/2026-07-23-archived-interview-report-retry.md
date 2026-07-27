# Archived Interview Report Retry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reload an unreadable archived interview report in place without refreshing the page.

**Architecture:** The partial report placeholder consumes the existing same-session archive retry action.

**Tech Stack:** React 18, TypeScript 5, Vitest, existing Interview snapshot lifecycle

## Global Constraints

- Retry targets the current archived session id.
- Partial session state remains preserved until retry begins.
- Live/no-target report placeholders do not gain an invalid action.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Report placeholder contract

**Files:**

- Modify: `apps/user-portal/src/components/interview/InterviewSidebar.test.tsx`
- Modify: `apps/user-portal/src/components/interview/ReportPanel.tsx`

- [x] **Step 1: Require enabled retry and disabled progress states in component tests**
- [x] **Step 2: Run focused test and confirm RED against the refresh-only placeholder**
- [x] **Step 3: Implement optional retry/progress props and UI**
- [x] **Step 4: Re-run and confirm component tests GREEN**

### Task 2: Workspace integration

**Files:**

- Modify: `apps/user-portal/src/components/interview/InterviewWorkspace.tsx`

- [x] **Step 1: Pass archive retry only when an archived target exists**
- [x] **Step 2: Pass current busy state as retry progress**
- [x] **Step 3: Preserve complete and live placeholder paths**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused Interview tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- RED: the two focused component tests failed because the placeholder had no retry/progress UI.
- GREEN: Interview sidebar component suite passed (`1` file, `4` tests).
- Focused Interview regression: passed (`5` files, `16` tests).
- ESLint: passed.
- TypeScript: passed after honoring `exactOptionalPropertyTypes` for the optional callback.
- Full User Portal Vitest: passed (`82` files, `264` tests).
- Production build: passed; Next.js generated `14` static pages.
- Prettier check: passed for the implementation, tests, design, and plan.
- `git diff --check`: passed with no output.
