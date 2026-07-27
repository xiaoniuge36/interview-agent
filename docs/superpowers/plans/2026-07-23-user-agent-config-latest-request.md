# User Agent Config Latest-request Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make User Agent config loads abortable, latest-owned, and unmount-safe.

**Architecture:** A feature-local request manager combines AbortController with monotonic ownership.

**Tech Stack:** React 18, TypeScript 5, Vitest, existing User Page Agent API

## Global Constraints

- Preserve current config/loading/error semantics and the public hook return shape.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Latest request manager

**Files:**

- Create: `apps/user-portal/src/components/user-agent/user-agent-config-request.ts`
- Create: `apps/user-portal/src/components/user-agent/user-agent-config-request.test.ts`

- [x] **Step 1: Write supersession, current error, and invalidation tests**
- [x] **Step 2: Run focused test and confirm RED because the manager is absent**
- [x] **Step 3: Implement abort plus monotonic ownership**
- [x] **Step 4: Re-run and confirm manager tests GREEN**

### Task 2: Config hook integration

**Files:**

- Modify: `apps/user-portal/src/components/user-agent/useUserAgentConfig.ts`

- [x] **Step 1: Create one stable request manager**
- [x] **Step 2: Pass its signal to the existing API**
- [x] **Step 3: Route state publication through current-only handlers**
- [x] **Step 4: Invalidate and abort from effect cleanup**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused user-agent tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- RED: focused test failed because `user-agent-config-request` did not exist, as expected.
- GREEN: request manager 1 file, 3 tests passed.
- Focused regression: config request, API, and runtime creation passed 3 files, 9 tests.
- Prettier: implementation, tests, design, and plan passed.
- ESLint: User Portal passed.
- TypeScript: User Portal passed.
- Full Vitest: 90 files, 284 tests passed.
- Production build: Next.js build passed and generated 14 static pages.
- Final diff: `git diff --check` passed; reviewed the request manager, hook integration, tests,
  design, and plan.
