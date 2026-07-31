# Learning Path V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Markdown learning center into an ordered eight-course AI Agent curriculum with recursive discovery, local completion progress, hands-on checkpoints and interview-oriented outputs.

**Architecture:** The existing server loader recursively discovers course and reference Markdown and produces a typed metadata model. Server components render content while a learning-only client provider stores completion and recent-reading state in localStorage; no API, database, shared contract or lockfile changes are required.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, Node `fs/promises`, React Markdown, Vitest, CSS, Markdown.

---

### Task 1: Recursive course document model

**Files:**

- Modify: `apps/user-portal/src/lib/learning/learning-documents.ts`
- Modify: `apps/user-portal/src/lib/learning/learning-documents.test.ts`

- [x] Write failing tests proving nested Markdown is discovered, relative-path slugs are unique, course metadata is parsed, course order wins over reference date, and fenced-code headings are ignored.
- [x] Run `pnpm --filter @interview-agent/user-portal test -- src/lib/learning/learning-documents.test.ts` and confirm the assertions fail for the missing recursive and metadata behavior.
- [x] Add `LearningDocumentKind`, `LearningLevel`, course fields, bounded recursive discovery and deterministic comparison.
- [x] Re-run the loader tests and keep every file below 300 lines and every function below 50 lines.

### Task 2: Versioned local learning progress

**Files:**

- Create: `apps/user-portal/src/lib/learning/learning-progress.ts`
- Create: `apps/user-portal/src/lib/learning/learning-progress.test.ts`
- Create: `apps/user-portal/src/components/learning/LearningProgressProvider.tsx`

- [x] Write failing tests for invalid JSON, deduplication, stale-course cleanup, opened-course recording, completion toggling and progress percentage.
- [x] Run the progress test and confirm failure because the model does not exist.
- [x] Implement pure progress transitions and a client provider using `interview-agent:learning-progress:v1`.
- [x] Re-run progress tests and targeted ESLint.

### Task 3: Curriculum-aware learning UI

**Files:**

- Modify: `apps/user-portal/src/components/learning/LearningCenter.tsx`
- Create: `apps/user-portal/src/components/learning/LearningLibraryRail.tsx`
- Create: `apps/user-portal/src/components/learning/LearningCourseActions.tsx`
- Modify: `apps/user-portal/src/components/learning/LearningCenter.test.tsx`
- Create: `apps/user-portal/src/app/styles/learning-path.css`
- Modify: `apps/user-portal/src/app/globals.css`

- [x] Extend the rendering test with grouped course/reference navigation, course metadata, progress labels, next-course link and practice CTA.
- [x] Run the component test and confirm the new expectations fail.
- [x] Wrap the page in the progress provider, split the library rail into a client component and add completion/next actions below the article.
- [x] Add learning-only responsive styles without modifying shared page or report components.
- [x] Re-run learning component tests, typecheck and targeted lint.

### Task 4: Eight-course curriculum and source governance

**Files:**

- Modify: `参考资料/参考项目Review.md`
- Create: `参考资料/学习路线/00-学习地图与能力验收.md`
- Create: `参考资料/学习路线/01-Agent基础与上下文工程.md`
- Create: `参考资料/学习路线/02-Tool-Calling与MCP.md`
- Create: `参考资料/学习路线/03-RAG与Agentic-RAG.md`
- Create: `参考资料/学习路线/04-Memory-Planning与Multi-Agent.md`
- Create: `参考资料/学习路线/05-Evals可观测可靠性与安全.md`
- Create: `参考资料/学习路线/06-生产架构成本部署与持续改进.md`
- Create: `参考资料/学习路线/07-面试表达手撕代码与毕业项目.md`

- [x] Add course frontmatter with kind, track, order, level, duration, summary and tags.
- [x] Write original course content with learning goals, mental models, trade-offs, labs, checkpoints, interview framing and source links.
- [x] Add a second-pass absorption matrix to the Review showing what each source changes in the curriculum or product.
- [x] Run the real loader and assert that it reports eight courses, one reference document and unique slugs.

### Task 5: Verification and conflict audit

**Files:**

- Modify: `docs/superpowers/plans/2026-07-29-learning-path-v2.md`

- [x] Run all learning tests and the complete User Portal test suite.
- [x] Run User Portal typecheck and full lint.
- [x] Run the User Portal production build and confirm `/learn` remains a dynamic route.
- [x] Run Prettier over changed code/docs and `git diff --check`.
- [x] Compare final changed files with task `019fa798-8277-7473-be4b-32c5874b8fc3` ownership and record zero overlap.

## Validation evidence

- Real loader: 8 courses, 1 reference, 9 unique slugs, no duplicates; default document is course 00.
- Learning tests: 3 files and 13 assertions passed, including unavailable browser storage fallback.
- Full User Portal tests: 114 files and 353 assertions passed.
- User Portal `typecheck` and full `lint`: exit 0.
- Production build: exit 0; `/learn` is server-rendered on demand (`ƒ`).
- Quality limits: all 11 TypeScript/TSX files are at most 274 lines; TypeScript AST audit found no function over 50 lines.
- Formatting and whitespace: task files pass Prettier; `git diff --check` returns no findings.
- Conflict audit: no writes overlap the parallel task's Product API, Admin Console, reports, home continuation, interview review, E2E, README or delivery-note ownership.
- Browser smoke: development-auth Chrome rendered all 8 courses, 1 reference document and the course actions; clicking completion changed progress from 0/8 to 1/8. Refresh persistence and mobile screenshots were not reverified because concurrent Next dev instances contested the shared `.next-dev` directory.
