# Learning Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-app learning center that automatically lists and renders Markdown files from the repository `参考资料` directory.

**Architecture:** A server-only document loader discovers and parses local Markdown files into a small serializable model. A server route selects a document from the query string and renders it with React Markdown and GFM support; navigation and responsive CSS expose the module throughout the existing user shell.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, Node `fs/promises`, react-markdown, remark-gfm, Vitest, CSS.

---

### Task 1: Document loader

**Files:**

- Create: `apps/user-portal/src/lib/learning/learning-documents.ts`
- Test: `apps/user-portal/src/lib/learning/learning-documents.test.ts`

- [x] Write tests using a temporary directory for Markdown filtering, frontmatter metadata, slug generation, heading extraction and deterministic ordering.
- [x] Run `pnpm --filter @interview-agent/user-portal test -- src/lib/learning/learning-documents.test.ts` and confirm the missing-module failure.
- [x] Implement `loadLearningDocuments()` with an injectable root directory and a fixed production default.
- [x] Re-run the test and confirm it passes.

### Task 2: Markdown reader UI

**Files:**

- Create: `apps/user-portal/src/components/learning/LearningCenter.tsx`
- Create: `apps/user-portal/src/components/learning/LearningArticle.tsx`
- Test: `apps/user-portal/src/components/learning/LearningCenter.test.tsx`
- Modify: `apps/user-portal/package.json`
- Modify: `pnpm-lock.yaml`

- [x] Add `react-markdown@^10.1.0` and `remark-gfm@^4.0.1` to the User Portal dependencies and regenerate the lockfile.
- [x] Write a rendering test that asserts document navigation, GFM table output, heading anchors and safe external-link attributes.
- [x] Implement the library sidebar, article metadata, Markdown component mapping and table of contents.
- [x] Run the component test and confirm it passes.

### Task 3: Route and navigation

**Files:**

- Create: `apps/user-portal/src/app/(app)/learn/page.tsx`
- Modify: `apps/user-portal/src/components/shell/navigation.ts`
- Modify: `apps/user-portal/src/components/shell/NavigationIcon.tsx`
- Modify: `apps/user-portal/src/components/shell/MobileBottomNav.tsx`
- Modify: `apps/user-portal/src/components/shell/navigation.test.ts`
- Modify: `apps/user-portal/src/components/user-agent/user-agent-tools.ts`
- Modify: `apps/user-portal/src/components/user-agent/user-agent-tools.test.ts`

- [x] Extend the navigation test with `/learn`, nested-path and learning-item assertions.
- [x] Add the `learn` navigation ID, navigation copy and a dedicated open-book icon.
- [x] Add the server route that loads the library and selects the requested document with a first-document fallback.
- [x] Let the User Agent navigation tool recognize the learning center.
- [x] Run the navigation and learning tests.

### Task 4: Responsive learning design

**Files:**

- Create: `apps/user-portal/src/app/styles/learning-center.css`
- Create: `apps/user-portal/src/app/styles/learning-article.css`
- Modify: `apps/user-portal/src/app/globals.css`
- Modify: `apps/user-portal/src/app/styles/mobile-navigation.css`

- [x] Implement the three-column desktop layout, book-spine selected state, readable Markdown typography, tables, code blocks, empty state and keyboard focus.
- [x] Add responsive rules that collapse the layout to one column below 820px and preserve mobile bottom-navigation clearance.
- [x] Import the stylesheets from `globals.css`.

### Task 5: Verification

**Files:**

- Modify: `docs/superpowers/plans/2026-07-29-learning-center.md`

- [x] Run learning and navigation tests: 9 passed.
- [x] Run the complete User Portal test suite: 342 passed.
- [x] Run User Portal typecheck and lint: both passed.
- [x] Run the User Portal production build and confirm `/learn` is generated as a dynamic route.
- [x] Run Prettier check and `git diff --check`: both passed.

## Follow-up

- The current User Portal Dockerfile does not copy the repository-level `参考资料` directory. Container image support requires a separately approved infrastructure change.
