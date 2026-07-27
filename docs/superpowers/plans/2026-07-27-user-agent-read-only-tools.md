# User Agent Read-only Tool Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce the User Agent's read-only advice/navigation boundary in its PageAgent runtime configuration.

**Architecture:** `user-agent-runtime` owns a small factory that combines existing project-owned tools with explicit `null` overrides for default DOM mutation tools. Safe built-in coordination/read tools remain intact. The runtime creates PageController without an interaction mask and removes feedback only reachable through disabled mutation tools.

**Tech Stack:** React 18, TypeScript 5, Vitest, PageAgentCore, PageController

## Global Constraints

- Preserve `navigate_user_view`, read-only training queries, profile summary, conversations, APIs, and persistence.
- Do not change shared contracts, schemas, dependencies, root configuration, database, CI, Admin Agent, or backend modules.
- Do not stage, commit, push, create a PR, or alter unrelated working-tree changes.

---

### Task 1: Runtime mutation-tool denylist

**Files:**

- Modify: `apps/user-portal/src/components/user-agent/user-agent-runtime.ts`
- Modify: `apps/user-portal/src/components/user-agent/user-agent-runtime.test.ts`

**Interfaces:**

- `createUserPageAgentRuntimeTools(tool)` returns project-owned tools plus `null` overrides.

- [x] **Step 1: Write failing tool-boundary tests**

```ts
const tools = createUserPageAgentRuntimeTools(identityTool);
expect(tools.navigate_user_view).toBeDefined();
expect(tools.get_practice_recommendations).toBeDefined();
expect(tools.click_element_by_index).toBeNull();
expect(tools.input_text).toBeNull();
expect(tools.select_dropdown_option).toBeNull();
expect(tools.execute_javascript).toBeNull();
expect(tools.scroll_horizontally).toBeNull();
```

- [x] **Step 2: Run focused test and confirm RED**

Run: `pnpm --filter @interview-agent/user-portal test -- user-agent-runtime.test.ts`

Expected: FAIL because `createUserPageAgentRuntimeTools` is not exported.

- [x] **Step 3: Create the mutation-tool denylist and use it in PageAgentCore configuration**

```ts
export function createUserPageAgentRuntimeTools(tool: ToolFactory) {
  return {
    ...createUserPageAgentTools(tool),
    click_element_by_index: null,
    input_text: null,
    select_dropdown_option: null,
    execute_javascript: null,
    scroll_horizontally: null,
  };
}
```

- [x] **Step 4: Disable interaction-only visual feedback**

Remove the click/input/select activity mask and pointer-highlight wiring; create PageController with
`enableMask: false`. Retain semantic-tag cleanup after page indexing.

- [x] **Step 5: Re-run focused tests and confirm GREEN**

Run: `pnpm --filter @interview-agent/user-portal test -- user-agent-runtime.test.ts`

Expected: PASS.

### Task 2: Completion verification

- [x] **Step 1: Run Prettier and focused runtime tests**
- [x] **Step 2: Run User Portal lint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check` and review scope**

## Verification Evidence

- RED: focused runtime test failed because `createUserPageAgentRuntimeTools` was not exported.
- GREEN: focused runtime test passed 5/5 after the explicit mutation-tool denylist was added.
- Prettier, User Portal ESLint, and User Portal TypeScript passed.
- User Portal Vitest passed 96 files and 297 tests; Next.js production build completed with 14
  static pages.
- `git diff --check` passed after final scope review.
