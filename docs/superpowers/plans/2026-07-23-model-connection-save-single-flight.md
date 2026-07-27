# Model Connection Save Single-flight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent duplicate model connection saves and mid-save cancellation.

**Architecture:** A stable per-editor exclusive runner owns validation and the full create/update workflow.

**Tech Stack:** React 18, TypeScript 5, Vitest, existing model credential API

## Global Constraints

- At most one save workflow may execute per mounted editor.
- Ignored submissions produce no validation, state, API, notification, or callback effect.
- Cancel and submit remain disabled while save is owned.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Save exclusive runner

**Files:**

- Create: `apps/user-portal/src/components/settings/model-connection-save.ts`
- Create: `apps/user-portal/src/components/settings/model-connection-save.test.ts`

- [x] **Step 1: Write duplicate/retry and rejection-unlock tests**
- [x] **Step 2: Run focused test and confirm RED because the module is absent**
- [x] **Step 3: Implement the synchronous exclusive runner**
- [x] **Step 4: Re-run and confirm runner tests GREEN**

### Task 2: Editor integration

**Files:**

- Modify: `apps/user-portal/src/components/settings/ModelConnectionEditor.tsx`

- [x] **Step 1: Create one stable runner in `useConnectionEditor`**
- [x] **Step 2: Wrap validation and complete save effects**
- [x] **Step 3: Disable cancel while busy**
- [x] **Step 4: Preserve create/update payload and feedback behavior**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused Settings tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- RED: focused Vitest failed because `model-connection-save` did not exist.
- GREEN: save runner passed (`1` file, `2` tests).
- Focused Settings regression: passed (`5` files, `12` tests).
- ESLint: passed.
- TypeScript: passed.
- Full User Portal Vitest: passed (`85` files, `272` tests).
- Production build: passed; Next.js generated `14` static pages.
- Prettier check: passed for the implementation, tests, design, and plan.
- `git diff --check`: passed with no output.
