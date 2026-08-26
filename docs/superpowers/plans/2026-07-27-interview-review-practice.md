# Interview Review Practice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user turn an actionable mock-interview report into a confirmed, source-linked targeted practice session.

**Architecture:** Extend the existing practice create contract with a constrained `interview_review` mode and an owned source interview id. Product API derives question types from persisted report stage scores and creates an ordinary practice session, while the User Portal presents the focus and explicit confirmation before calling the existing create endpoint.

**Tech Stack:** Zod shared contracts, Prisma 6/PostgreSQL, NestJS 11, Next.js 15, React 18, Jest, Vitest.

## Global Constraints

- A user must confirm before any `interview_review` session is created.
- Persist only `sourceInterviewSessionId`; never copy interview transcript, answers, feedback, missing points, prompts, or credentials into practice records.
- Source interview and report reads are scoped by tenant and current user; Product API validates the source server-side.
- Focus is the lowest two stage scores below 70; map only `self_intro`/`hr`, `tech_basics`/`jd_core`, `project_deep_dive`, and `scenario_design` to the agreed question types.
- Prefer matching the source job's role category and selected question types, then fall back to selected types across published tenant/public questions; never create a generic fallback session.
- Do not change Agent permissions, model calls, Admin Console, dependencies, or root configuration.
- Do not stage, commit, push, open a PR, or alter unrelated worktree changes.

---

### Task 1: Extend the durable practice contract and source relation

**Files:**

- Modify: `packages/contracts/src/schemas/practice.ts`
- Modify: `packages/contracts/src/contracts.test.ts`
- Modify: `apps/product-api/prisma/schema/enums.prisma`
- Modify: `apps/product-api/prisma/schema/content.prisma`
- Modify: `apps/product-api/prisma/schema/interview.prisma`
- Create: `apps/product-api/prisma/schema/migrations/20260727130000_add_interview_review_practice/migration.sql`
- Modify: `apps/product-api/src/modules/practice/practice-mappers.ts`

**Interfaces:**

- `PracticeModeSchema` adds `'interview_review'`.
- `CreatePracticeSessionSchema` adds `sourceInterviewSessionId?: string` and rejects it unless `mode === 'interview_review'`; `interview_review` requires it and cannot accept `questionIds`.
- `PracticeSessionSchema` adds `sourceInterviewSessionId: string | null`.
- `PracticeSession.sourceInterviewSessionId` is nullable, indexed with `tenantId`, and relates to `InterviewSession.id` with `ON DELETE SET NULL`.

- [ ] **Step 1: Write a failing contract test for a source-linked interview review.**

```ts
test('practice sessions accept only a source-bound interview review mode', () => {
  assert.deepEqual(
    CreatePracticeSessionSchema.parse({
      mode: 'interview_review',
      sourceInterviewSessionId: 'interview-1',
    }),
    { mode: 'interview_review', sourceInterviewSessionId: 'interview-1' },
  );
  assert.equal(CreatePracticeSessionSchema.safeParse({ mode: 'interview_review' }).success, false);
  assert.equal(
    CreatePracticeSessionSchema.safeParse({
      mode: 'smart',
      sourceInterviewSessionId: 'interview-1',
    }).success,
    false,
  );
});
```

- [ ] **Step 2: Verify RED.**

Run: `pnpm --filter @interview-agent/contracts test`

Expected: FAIL because `interview_review` and `sourceInterviewSessionId` are not accepted.

- [ ] **Step 3: Add contract, Prisma schema, and migration.**

```ts
export const PracticeModeSchema = z.enum([
  'smart',
  'manual',
  'weakness_review',
  'interview_review',
]);

export const CreatePracticeSessionSchema = z
  .object({
    title: z.string().min(1).max(CONTRACT_LIMITS.shortText).optional(),
    mode: PracticeModeSchema.optional(),
    jobIntentId: z.string().min(1).optional(),
    questionIds: z.array(z.string().min(1)).min(1).max(MAX_PRACTICE_QUESTIONS).optional(),
    sourceInterviewSessionId: z.string().min(1).optional(),
  })
  .superRefine((value, context) => {
    if (value.mode === 'interview_review' && !value.sourceInterviewSessionId)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sourceInterviewSessionId'],
        message: 'required',
      });
    if (value.mode !== 'interview_review' && value.sourceInterviewSessionId)
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['mode'], message: 'invalid source' });
    if (value.mode === 'interview_review' && value.questionIds)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['questionIds'],
        message: 'not allowed',
      });
  });
```

```prisma
// content.prisma
sourceInterviewSessionId String?
sourceInterviewSession   InterviewSession? @relation("InterviewReviewPracticeSessions", fields: [sourceInterviewSessionId], references: [id], onDelete: SetNull)
@@index([tenantId, sourceInterviewSessionId])

// interview.prisma
reviewPracticeSessions PracticeSession[] @relation("InterviewReviewPracticeSessions")
```

```sql
ALTER TYPE "PracticeMode" ADD VALUE 'interview_review';
ALTER TABLE "PracticeSession" ADD COLUMN "sourceInterviewSessionId" TEXT;
CREATE INDEX "PracticeSession_tenantId_sourceInterviewSessionId_idx"
  ON "PracticeSession"("tenantId", "sourceInterviewSessionId");
ALTER TABLE "PracticeSession"
  ADD CONSTRAINT "PracticeSession_sourceInterviewSessionId_fkey"
  FOREIGN KEY ("sourceInterviewSessionId") REFERENCES "InterviewSession"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
```

Update `practiceSessionData` to connect `sourceInterviewSession` only when the validated source id is present, and map the nullable id through `mapSession`.

- [ ] **Step 4: Validate GREEN.**

Run: `pnpm --filter @interview-agent/contracts test`

Expected: PASS; the existing practice modes remain valid and the new mode requires exactly its source id.

---

### Task 2: Select questions from an owned interview report

**Files:**

- Create: `apps/product-api/src/modules/practice/interview-review-selector.ts`
- Create: `apps/product-api/src/modules/practice/interview-review-selector.spec.ts`
- Modify: `apps/product-api/src/modules/practice/practice-command.service.ts`
- Modify: `apps/product-api/src/modules/practice/practice-command-weakness.spec.ts`

**Interfaces:**

- `deriveInterviewReviewFocus(stageScores)` returns at most two `{ stage, questionType, score }` entries for scores below 70.
- `selectInterviewReviewQuestions(prisma, context, sourceInterviewSessionId)` returns 1–5 published questions after source ownership, report-ready, role-first, then type-only selection.
- `PracticeCommandService.create` sends `interview_review` creation through this selector and writes the verified source relation through `practiceSessionData`.

- [ ] **Step 1: Write failing selector and command tests.**

```ts
it('maps the two lowest actionable report stages to practice question types', () => {
  expect(
    deriveInterviewReviewFocus([
      { stage: 'jd_core', score: 58, summary: '', evidence: [] },
      { stage: 'project_deep_dive', score: 42, summary: '', evidence: [] },
      { stage: 'hr', score: 76, summary: '', evidence: [] },
    ]),
  ).toEqual([
    { stage: 'project_deep_dive', questionType: 'project_deep_dive', score: 42 },
    { stage: 'jd_core', questionType: 'short_answer', score: 58 },
  ]);
});

it('creates a source-linked practice session from an owned ready report', async () => {
  const session = await service.create(context, {
    mode: 'interview_review',
    sourceInterviewSessionId: 'interview-1',
  });

  expect(session).toMatchObject({
    mode: 'interview_review',
    sourceInterviewSessionId: 'interview-1',
  });
});
```

- [ ] **Step 2: Verify RED.**

Run: `pnpm --filter @interview-agent/product-api test -- interview-review-selector.spec.ts practice-command-weakness.spec.ts --runInBand`

Expected: FAIL because no report-stage selector or `interview_review` command branch exists.

- [ ] **Step 3: Implement deterministic focus and selection.**

```ts
const STAGE_TYPE: Partial<Record<InterviewStage, QuestionType>> = {
  self_intro: 'behavioral',
  hr: 'behavioral',
  tech_basics: 'short_answer',
  jd_core: 'short_answer',
  project_deep_dive: 'project_deep_dive',
  scenario_design: 'system_design',
};

export function deriveInterviewReviewFocus(stageScores: StageScore[]) {
  return stageScores
    .flatMap((score) => {
      const questionType = STAGE_TYPE[score.stage];
      return questionType && score.score < 70
        ? [{ stage: score.stage, questionType, score: score.score }]
        : [];
    })
    .sort((left, right) => left.score - right.score)
    .slice(0, 2);
}
```

Load the source with `{ id, tenantId, userId, status: 'report_ready', report, jobIntent }`; reject missing, non-owned, no-report, and no-actionable-focus sources with deterministic error codes. Query published tenant/public questions by the derived type list, first with the role category tag from `jobIntent.targetRole`, then by type only while excluding selected ids. Do not query transcript or turn feedback. Use title `面试专项回练` and write the source relation only after the source passes validation.

- [ ] **Step 4: Verify GREEN.**

Run: `pnpm --filter @interview-agent/product-api test -- interview-review-selector.spec.ts practice-command-weakness.spec.ts --runInBand`

Expected: PASS; ownership, no-actionable, role-first fallback, empty-selection rejection, and normal weakness review behavior are covered.

---

### Task 3: Add the confirmed report-to-practice portal action

**Files:**

- Create: `apps/user-portal/src/components/interview/interview-review-practice.ts`
- Create: `apps/user-portal/src/components/interview/interview-review-practice.test.ts`
- Create: `apps/user-portal/src/components/interview/InterviewReviewPracticeAction.tsx`
- Create: `apps/user-portal/src/components/interview/InterviewReviewPracticeAction.test.tsx`
- Create: `apps/user-portal/src/components/interview/useInterviewReviewPractice.ts`
- Modify: `apps/user-portal/src/components/interview/ReportPanel.tsx`
- Modify: `apps/user-portal/src/components/interview/InterviewWorkspace.tsx`
- Modify: `apps/user-portal/src/app/styles/interview.css`

**Interfaces:**

- `interviewReviewFocus(report)` returns no more than two stage labels and scores below 70.
- `createInterviewReviewRequest(sessionId)` returns `{ mode: 'interview_review', sourceInterviewSessionId: sessionId }`.
- `useInterviewReviewPractice` returns `{ starting, start(sessionId) }`; it uses the existing `createPracticeSession`, prevents duplicate requests, sends success/error notifications, and navigates only after a successful response.
- `ReportPanel` receives `sessionId`, `onStartInterviewReview`, and `reviewStarting` in addition to its existing report-retry props.

- [ ] **Step 1: Write failing model and render tests.**

```tsx
it('renders two lowest actionable interview stages before the user confirms creation', () => {
  const markup = renderToStaticMarkup(
    <InterviewReviewPracticeAction
      report={reportWithScores({ project_deep_dive: 42, jd_core: 58 })}
      sessionId="interview-1"
      starting={false}
      onStart={() => undefined}
    />,
  );

  expect(markup).toContain('面试专项回练');
  expect(markup).toContain('项目深挖');
  expect(markup).toContain('开始专项回练');
});

it('omits the action when all scored skills are at or above seventy', () => {
  expect(interviewReviewFocus(reportWithScores({ jd_core: 70 }))).toEqual([]);
});
```

- [ ] **Step 2: Verify RED.**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run interview-review-practice.test.ts InterviewReviewPracticeAction.test.tsx --pool=threads --poolOptions.threads.singleThread`

Expected: FAIL because the focus model and confirmed action do not exist.

- [ ] **Step 3: Implement presentation, confirmation, and single-flight creation.**

```ts
export function createInterviewReviewRequest(sourceInterviewSessionId: string) {
  return { mode: 'interview_review' as const, sourceInterviewSessionId };
}
```

```tsx
{
  focus.length ? (
    <section className="interview-review-action" aria-label="面试专项回练">
      <p>将围绕本次面试中得分较低的阶段组题，不会复制你的面试回答。</p>
      {confirmed ? (
        <button disabled={starting} type="button" onClick={() => onStart(sessionId)}>
          {starting ? '正在组题…' : '开始专项回练'}
        </button>
      ) : (
        <button type="button" onClick={() => setConfirmed(true)}>
          查看并确认回练
        </button>
      )}
    </section>
  ) : null;
}
```

The hook calls `createPracticeSession(createInterviewReviewRequest(sessionId))`; on success it notifies
the user and routes to `/practice?session=${session.id}`. On failure it preserves the report and uses
the existing notification system. The action must not call API creation while merely opening or closing
the confirmation panel.

- [ ] **Step 4: Verify GREEN.**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run interview-review-practice.test.ts InterviewReviewPracticeAction.test.tsx InterviewSidebar.test.tsx --pool=threads --poolOptions.threads.singleThread`

Expected: PASS; only actionable reports expose a two-step, explicit-confirmation recovery path.

---

### Task 4: Run final cross-layer verification

- [ ] **Step 1: Run Prisma validation and generation.**

Run: `$env:DATABASE_URL='postgresql://validation:validation@127.0.0.1:5432/validation'; pnpm --filter @interview-agent/product-api exec prisma validate --schema prisma/schema; pnpm --filter @interview-agent/product-api db:generate`

Expected: the schema validates and Prisma Client generation succeeds.

- [ ] **Step 2: Run focused and complete test suites serially.**

Run: `pnpm --filter @interview-agent/contracts test; pnpm --filter @interview-agent/product-api test -- --runInBand; pnpm --filter @interview-agent/user-portal exec vitest run --pool=threads --poolOptions.threads.singleThread`

Expected: all non-environment suites pass; any existing environment-only skips remain reported as skips.

- [ ] **Step 3: Run both lint/typecheck/build gates serially.**

Run: `pnpm --filter @interview-agent/product-api lint; pnpm --filter @interview-agent/product-api typecheck; pnpm --filter @interview-agent/product-api build; pnpm --filter @interview-agent/user-portal lint; pnpm --filter @interview-agent/user-portal typecheck; pnpm --filter @interview-agent/user-portal build`

Expected: each command exits 0.

- [ ] **Step 4: Check formatting and scoped diff quality.**

Run: `pnpm exec prettier --check packages/contracts/src/schemas/practice.ts apps/product-api/src/modules/practice/interview-review-selector.ts apps/product-api/src/modules/practice/practice-command.service.ts apps/user-portal/src/components/interview/interview-review-practice.ts apps/user-portal/src/components/interview/InterviewReviewPracticeAction.tsx apps/user-portal/src/components/interview/useInterviewReviewPractice.ts; git diff --check`

Expected: Prettier checks supported source files and `git diff --check` has no whitespace errors. Do not stage, commit, push, or create a PR.
