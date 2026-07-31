# Objective Question Bank Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add first-class single-choice and multiple-choice practice questions plus 32 curated AI Agent questions.

**Architecture:** Extend the shared question contract and Prisma records with bounded structured options while keeping the existing string answer submission API. Public catalog and practice projections expose options but omit correct option IDs; the React player serializes selected IDs into the existing draft flow.

**Tech Stack:** TypeScript, Zod, Prisma/PostgreSQL, NestJS, React/Next.js, Vitest/Jest

---

### Task 1: Extend the shared question contract

**Files:**

- Modify: `packages/contracts/src/schemas/training.ts`
- Modify: `packages/contracts/src/schemas/question-catalog.ts`
- Modify: `packages/contracts/src/schemas/practice.ts`
- Modify: `packages/contracts/src/contracts.test.ts`
- Modify: `packages/contracts/src/question-catalog.test.ts`

- [x] Add failing tests for valid and invalid objective questions and answer privacy.
- [x] Run `pnpm --filter @interview-agent/contracts test` and confirm failure because objective types/options are unsupported.
- [x] Add `QuestionOptionSchema`, the two types, bounded conditional validation, and safe catalog/practice projections.
- [x] Re-run the contracts tests and confirm success.

### Task 2: Persist objective-question data

**Files:**

- Modify: `apps/product-api/prisma/schema/enums.prisma`
- Modify: `apps/product-api/prisma/schema/content.prisma`
- Create: `apps/product-api/prisma/schema/migrations/20260729180000_objective_question_types/migration.sql`
- Modify: `apps/product-api/prisma/seed.ts`
- Modify: `apps/product-api/src/modules/content-review/candidate-publication.service.ts`

- [x] Add the enum values and `options`/`correctOptionIds` fields to question records and migration SQL.
- [x] Persist the fields from seeds and candidate publication.
- [x] Run `pnpm db:validate` and `pnpm db:generate` and confirm both exit successfully.

### Task 3: Add the curated question set

**Files:**

- Create: `apps/product-api/src/modules/practice/public-agent-question-builders.ts`
- Create: `apps/product-api/src/modules/practice/public-agent-choice-questions.ts`
- Create: `apps/product-api/src/modules/practice/public-agent-single-choice-questions.ts`
- Create: `apps/product-api/src/modules/practice/public-agent-multiple-choice-questions.ts`
- Create: `apps/product-api/src/modules/practice/public-agent-open-questions.ts`
- Modify: `apps/product-api/src/modules/practice/public-practice-questions.ts`
- Modify: `apps/product-api/src/modules/practice/public-practice-questions.spec.ts`

- [x] Add failing assertions for 67 public practice questions, 12 single-choice questions, 8 multiple-choice questions, and unique IDs.
- [x] Run the public-question test and confirm the count/type assertions fail.
- [x] Add 32 newly written questions with bounded options, reference answers, rubrics, topic tags, and source URLs.
- [x] Re-run the test and confirm every question satisfies `QuestionSchema`.

### Task 4: Expose options through catalog and evaluation safely

**Files:**

- Modify: `apps/product-api/src/modules/question-catalog/question-catalog-query.ts`
- Modify: `apps/product-api/src/modules/question-catalog/question-catalog.service.spec.ts`
- Modify: `apps/product-api/src/modules/practice/practice-evaluation-command.service.ts`
- Modify: `apps/product-api/src/modules/practice/practice-model-evaluator.ts`
- Modify: `apps/product-api/src/modules/practice/practice-model-evaluator.spec.ts`

- [x] Add failing tests showing catalog items include options without correct IDs and evaluation prompts include option text.
- [x] Run the targeted Product API tests and confirm the expected failures.
- [x] Map options into the catalog response and model evaluation input while keeping correct IDs server-only.
- [x] Re-run the targeted tests and confirm success.

### Task 5: Add interactive radio and checkbox answering

**Files:**

- Create: `apps/user-portal/src/components/practice/player/practice-choice-answer.ts`
- Create: `apps/user-portal/src/components/practice/player/practice-choice-answer.test.ts`
- Modify: `apps/user-portal/src/components/practice/player/PracticeQuestionStage.tsx`
- Modify: `apps/user-portal/src/components/practice/player/PracticeQuestionStage.test.tsx`
- Modify: `apps/user-portal/src/app/styles/practice-player-stage.css`
- Modify: `apps/user-portal/src/components/questions/QuestionFilterPanel.tsx`
- Modify: `apps/user-portal/src/components/questions/QuestionCatalogList.tsx`
- Modify: `apps/user-portal/src/components/search/global-search-model.ts`
- Modify: `apps/admin-console/src/components/dashboard/QuestionAssetsTable.tsx`

- [x] Add failing helper/component tests for canonical single/multiple selection and objective controls.
- [x] Run the targeted user-portal tests and confirm failure because the controls/helpers do not exist.
- [x] Implement canonical selection helpers, radio/checkbox rendering, styling, and all question-type labels.
- [x] Re-run user-portal tests and confirm success.

### Task 6: Integration verification

**Files:**

- Verify all files above and inspect the complete diff without modifying unrelated worktree changes.

- [x] Run Prettier on task-owned files.
- [x] Run contracts, Product API, user portal, and admin console targeted tests.
- [x] Run `pnpm db:validate` and `pnpm db:generate`; attempt global typecheck, lint, and build and record unrelated worktree blockers.
- [x] Review the requirements checklist and report any command that cannot run or any failure unrelated to this change.
