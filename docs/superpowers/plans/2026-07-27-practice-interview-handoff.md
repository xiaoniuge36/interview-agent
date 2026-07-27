# Practice-to-Interview Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user move from an AI-completed practice report to the existing, user-confirmed mock-interview entry point.

**Architecture:** `PracticeCompletionPanel` already determines whether the practice session is AI-completed. Its header will conditionally render a Next.js link to `/interview`; no controller, API, or interview state changes are required.

**Tech Stack:** Next.js 15, React 18, TypeScript 5, Vitest

## Global Constraints

- The new link is navigation only; it must not create an interview or consume a model.
- Preserve the existing weakness-review and next-recommendation priority.
- Do not change APIs, contracts, schemas, persistence, dependencies, root configuration, backend, or Admin Console modules.
- Do not stage, commit, push, create a PR, or alter unrelated working-tree changes.

---

### Task 1: Offer mock-interview validation after an AI practice report

**Files:**

- Modify: `apps/user-portal/src/components/practice/player/PracticeCompletionPanel.tsx`
- Modify: `apps/user-portal/src/components/practice/player/PracticeCompletionPanel.test.tsx`

**Interfaces:**

- `CompletionHeader` renders `Link href="/interview"` only when its `aiCompleted` input is true.

- [x] **Step 1: Write the failing render assertions**

```ts
expect(aiCompletedMarkup).toContain('用模拟面试检验本轮提升');
expect(aiCompletedMarkup).toContain('href="/interview"');
expect(selfStudyMarkup).not.toContain('用模拟面试检验本轮提升');
```

- [x] **Step 2: Run the focused test to verify RED**

Run: `pnpm --filter @interview-agent/user-portal test -- PracticeCompletionPanel.test.tsx`

Expected: FAIL because the completion header has no mock-interview validation link.

- [x] **Step 3: Write the minimal conditional link**

```tsx
{
  props.aiCompleted ? <Link href="/interview">用模拟面试检验本轮提升</Link> : null;
}
```

- [x] **Step 4: Re-run the focused test to verify GREEN**

Run: `pnpm --filter @interview-agent/user-portal test -- PracticeCompletionPanel.test.tsx`

Expected: PASS.

### Task 2: Completion verification

- [x] **Step 1: Run Prettier on the planned files.**
- [x] **Step 2: Run focused tests, User Portal lint, and TypeScript.**
- [x] **Step 3: Run full User Portal Vitest and production build.**
- [x] **Step 4: Run `git diff --check` and confirm planned-file integrity.**
