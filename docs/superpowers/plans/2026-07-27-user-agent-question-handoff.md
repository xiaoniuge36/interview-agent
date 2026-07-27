# User Agent Question Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the Agent-to-question-picker training intent while requiring the user to confirm the existing practice-start action.

**Architecture:** `user-agent-tools` owns the deterministic navigation URL for each portal view. The question picker converts only the Agent’s `source=agent` marker into a display prop, and the existing recommendation banner renders the handoff copy without altering its action callbacks.

**Tech Stack:** Next.js 15, React 18, TypeScript 5, Vitest

## Global Constraints

- The URL marker is presentation-only; no API, persistence, contract, schema, or permission changes.
- Do not replace the existing user-confirmed recommendation-start flow.
- Do not stage, commit, push, create a PR, or alter unrelated working-tree changes.

---

### Task 1: Define and expose the Agent navigation handoff URL

**Files:**

- Modify: `apps/user-portal/src/components/user-agent/user-agent-tools.ts`
- Create: `apps/user-portal/src/components/user-agent/user-agent-tools.test.ts`

**Interfaces:**

- `userAgentNavigationPath(view: NavigationId): string` returns `/questions?source=agent` for
  `questions` and the existing static route for every other view.

- [x] **Step 1: Write the failing test**

```ts
expect(userAgentNavigationPath('questions')).toBe('/questions?source=agent');
expect(userAgentNavigationPath('reports')).toBe('/reports');
```

- [x] **Step 2: Run the focused test to verify RED**

Run: `pnpm --filter @interview-agent/user-portal test -- user-agent-tools.test.ts`

Expected: FAIL because `userAgentNavigationPath` is not exported.

- [x] **Step 3: Write minimal implementation**

```ts
export function userAgentNavigationPath(view: NavigationId) {
  return view === 'questions' ? '/questions?source=agent' : NAVIGATION_PATHS[view];
}
```

- [x] **Step 4: Use the helper in `navigate_user_view` and verify GREEN**

Run: `pnpm --filter @interview-agent/user-portal test -- user-agent-tools.test.ts`

Expected: PASS.

### Task 2: Render the user-confirmation handoff notice

**Files:**

- Modify: `apps/user-portal/src/components/questions/QuestionPickerPage.tsx`
- Modify: `apps/user-portal/src/components/questions/QuestionRecommendationBanner.tsx`
- Modify: `apps/user-portal/src/components/questions/QuestionRecommendationBanner.test.tsx`

**Interfaces:**

- `QuestionRecommendationBanner` accepts `agentHandoff: boolean`.
- `QuestionPickerPage` sets it when `useSearchParams().get('source') === 'agent'`.

- [x] **Step 1: Write the failing render tests**

```ts
expect(agentHandoffMarkup).toContain('AI 刷题教练已为你带到推荐训练入口');
expect(agentHandoffMarkup).toContain('确认采用后才会创建本轮题单');
expect(standardMarkup).not.toContain('AI 刷题教练已为你带到推荐训练入口');
```

- [x] **Step 2: Run the focused test to verify RED**

Run: `pnpm --filter @interview-agent/user-portal test -- QuestionRecommendationBanner.test.tsx`

Expected: FAIL because `agentHandoff` is not a component prop and the handoff copy is absent.

- [x] **Step 3: Write minimal implementation**

```tsx
{
  agentHandoff ? (
    <p className="question-agent-handoff" role="status">
      AI 刷题教练已为你带到推荐训练入口；确认采用后才会创建本轮题单。
    </p>
  ) : null;
}
```

- [x] **Step 4: Read the query marker in the page and verify GREEN**

Run: `pnpm --filter @interview-agent/user-portal test -- QuestionRecommendationBanner.test.tsx`

Expected: PASS.

### Task 3: Completion verification

- [x] **Step 1: Format modified User Portal source and documents with Prettier.**
- [x] **Step 2: Run focused tests, User Portal lint, and TypeScript.**
- [x] **Step 3: Run User Portal Vitest and production build.**
- [x] **Step 4: Run `git diff --check` and review planned-file integrity.**
