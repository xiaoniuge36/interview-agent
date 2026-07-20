# 刷题 Agent 闭环与智能复盘 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 允许用户在答案全部保存后，经额度确认自动补齐未评价题目并生成整轮复盘，同时让推荐真正结合 JD、个人档案、掌握度和近期练习。

**Architecture:** 复盘继续走现有 `POST /practices/:id/submit`，由 Product API 的 `PracticeCompletionService` 在生成报告前调用现有 `PracticeEvaluationCommandService` 补齐缺失评价；已有评价复用，报告和掌握度保持现有事务边界。用户端在 `usePracticePlayer` 中根据待评价数量弹出二次确认，提交完成后刷新会话、报告和掌握度。推荐服务扩展现有 Prisma 读取与确定性排序，不引入新的 AI 调用、表或契约字段。

**Tech Stack:** Next.js/React, NestJS, Prisma, Zod contracts, Jest/Vitest, existing notification and model credential services.

## Global Constraints

- 不新增独立系统、数据库表、迁移、根配置或依赖。
- 模型调用继续留在 Product API，不在浏览器端拼接 prompt。
- 未确认额度消耗时不发送复盘提交请求；取消确认不改变会话状态。
- 保留答案、已有评价和现有幂等语义；模型失败不创建半成品报告。
- 仅修改本任务相关文件，保护工作区中已有未提交改动。

---

### Task 1: 固化前端复盘可用性模型

**Files:**

- Modify: `apps/user-portal/src/components/practice/player/practice-player-model.ts`
- Modify: `apps/user-portal/src/components/practice/player/practice-player-model.test.ts`

**Interfaces:**

- Produces `pendingEvaluationCount(session)` and changes `canSubmitAiReport(session)` to depend on all answers being saved, not all items already evaluated.

- [ ] **Step 1: Write the failing tests**

Add assertions beside the existing progress tests:

```ts
it('答案全部保存但部分题目未评价时允许发起整轮复盘', () => {
  const completeAnswers = session({ answerAll: true });
  expect(canCompleteSelfStudy(completeAnswers)).toBe(true);
  expect(canSubmitAiReport(completeAnswers)).toBe(true);
  expect(pendingEvaluationCount(completeAnswers)).toBe(2);
});

it('答案未全部保存时不允许发起整轮复盘', () => {
  expect(canSubmitAiReport(session())).toBe(false);
  expect(pendingEvaluationCount(session())).toBe(2);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```powershell
pnpm --filter @interview-agent/user-portal test --run src/components/practice/player/practice-player-model.test.ts
```

Expected: FAIL because `canSubmitAiReport` currently requires every `evaluation`.

- [ ] **Step 3: Implement the smallest model change**

Implement:

```ts
export function pendingEvaluationCount(session: PracticeSession) {
  return session.items.filter((item) => Boolean(item.answer) && !item.evaluation).length;
}

export function canSubmitAiReport(session: PracticeSession) {
  return canCompleteSelfStudy(session);
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run the command from Step 2. Expected: PASS.

### Task 2: 添加额度确认与复盘过程状态

**Files:**

- Modify: `apps/user-portal/src/components/practice/player/usePracticePlayer.ts`
- Modify: `apps/user-portal/src/components/practice/player/PracticePlayer.tsx`
- Modify: `apps/user-portal/src/components/practice/player/practice-player-actions.ts`
- Modify: `apps/user-portal/src/app/styles/practice-player-coach.css`
- Modify: `apps/user-portal/src/app/styles/practice-player-responsive.css`

**Interfaces:**

- `submitAiReport` continues to be the completion action.
- `PlayerBusy` gains no new public API; its `submit-ai` value represents both confirmation-approved submission and backend completion.
- `RoundCompletionBar` consumes `pendingEvaluationCount` and shows the count near the submit action.

- [ ] **Step 1: Add the confirmation behavior before the API call**

In `usePracticeCompletionActions`, calculate the current pending count before `setBusy`. When the count is positive, call:

```ts
const confirmed = window.confirm(
  `本轮还有 ${pendingCount} 道题未完成 AI 评价。继续后将自动调用 AI 评价并生成整轮复盘，可能消耗模型额度，是否继续？`,
);
if (!confirmed) return;
```

Only after confirmation call `setBusy` and `submitPracticeSession`. Keep the existing catch path so errors preserve state and use notifications.

- [ ] **Step 2: Update the completion bar copy and disabled state**

Use:

```tsx
const pendingCount = pendingEvaluationCount(player.session);
const aiReady = canSubmitAiReport(player.session);
<strong>
  {pendingCount ? `已保存全部答案 · 复盘将自动评价 ${pendingCount} 题` : '全部题目已完成 AI 评价'}
</strong>;
```

The AI button is disabled only while busy or when answers are incomplete. The self-study button remains available whenever all answers are saved.

- [ ] **Step 3: Improve the visible progress state**

Show an inline status line while `busy === 'submit-ai'`: `正在补齐题目评价并生成复盘，请不要关闭页面…` and style it as a full-width operation status. Keep the existing responsive fixed action bar usable on mobile.

- [ ] **Step 4: Run user-portal model tests and lint the touched files**

Run:

```powershell
pnpm --filter @interview-agent/user-portal test --run src/components/practice/player/practice-player-model.test.ts
pnpm --filter @interview-agent/user-portal exec eslint src/components/practice/player/PracticePlayer.tsx src/components/practice/player/usePracticePlayer.ts src/components/practice/player/practice-player-actions.ts
```

Expected: PASS with no lint errors.

### Task 3: 后端自动补齐未评价题目

**Files:**

- Modify: `apps/product-api/src/modules/practice/practice-completion.service.ts`
- Modify: `apps/product-api/src/modules/practice/practice-completion.service.spec.ts`
- Modify: `apps/product-api/src/modules/practice/practice-command.integration.spec.ts`

**Interfaces:**

- `PracticeCompletionService` receives `PracticeEvaluationCommandService` and calls its existing `evaluate({ context, sessionId, itemId })` only for answered items without an evaluation.
- `submit` returns the existing `PracticeReport` contract and keeps report creation in its current serializable transaction.

- [ ] **Step 1: Add a failing unit test for partial evaluations**

Create a session fixture with two answered items where only the first has an evaluation. Inject a mocked evaluator and assert:

```ts
await service.submit(context, session.id);
expect(evaluator.evaluate).toHaveBeenCalledWith({
  context,
  sessionId: session.id,
  itemId: 'item-2',
});
expect(transaction.practiceReport.create).toHaveBeenCalledTimes(1);
```

Also add a failure assertion where `evaluator.evaluate` rejects and `practiceReport.create` is not called.

- [ ] **Step 2: Run the focused backend test and verify it fails**

Run:

```powershell
pnpm --filter @interview-agent/product-api test --runInBand src/modules/practice/practice-completion.service.spec.ts
```

Expected: FAIL because completion currently rejects incomplete evaluations before invoking a model evaluator.

- [ ] **Step 3: Implement the orchestration outside the long transaction**

At the start of `submit`, after ownership and answer validation, call a private method:

```ts
private async evaluatePendingItems(
  context: ProductRequestContext,
  session: SessionRecord,
) {
  const pending = session.items.filter((item) => item.answer && !item.evaluation);
  for (const item of pending) {
    await this.evaluations.evaluate({ context, sessionId: session.id, itemId: item.id });
  }
}
```

Reload the session after this method returns, then enter the existing serializable claim/report transaction. Replace the hard `requireEvaluation` rejection with an assertion that all evaluations now exist. This keeps model I/O outside the database transaction and lets failed model calls be retried without a report.

Inject the evaluator in the Nest module through the existing provider. Update direct test constructors; integration tests pass a no-op mock because their seeded sessions already contain evaluations.

- [ ] **Step 4: Run the focused backend tests and verify they pass**

Run the command from Step 2 plus:

```powershell
pnpm --filter @interview-agent/product-api test --runInBand src/modules/practice/practice-command.integration.spec.ts
```

Expected: unit PASS; integration PASS when `RUN_DATABASE_INTEGRATION=true`, otherwise the suite remains skipped as configured.

### Task 4: 升级推荐编排的 JD/档案/历史信号

**Files:**

- Modify: `apps/product-api/src/modules/practice/practice-recommendation.service.ts`
- Modify: `apps/product-api/src/modules/practice/practice-recommendation.service.spec.ts`
- Modify: `apps/user-portal/src/components/questions/QuestionRecommendationBanner.tsx`
- Modify: `apps/user-portal/src/components/home/question-hub/AgentRecommendationRail.tsx`
- Modify: `apps/user-portal/src/app/styles/question-picker-agent.css`
- Modify: `apps/user-portal/src/app/styles/question-hub-agent.css`

**Interfaces:**

- Keep `PracticeRecommendationSchema` unchanged.
- `reason` remains the explanation channel; no new contract field is needed.

- [ ] **Step 1: Add failing recommendation cases**

Extend the recommendation test fixture so the latest job includes `profile.skillWeights`, `profile.interviewFocus`, and `profile.riskSignals`; provide multiple mastery records and recent session items. Assert the Prisma question query includes the strongest capability tag and excludes recent IDs. Assert the returned reason contains both the JD focus and the mastery weakness.

- [ ] **Step 2: Run recommendation tests and verify the new case fails**

Run:

```powershell
pnpm --filter @interview-agent/product-api test --runInBand src/modules/practice/practice-recommendation.service.spec.ts
```

Expected: FAIL because the service currently selects only one weak tag and only reads `targetRole`.

- [ ] **Step 3: Implement deterministic context scoring**

Read the latest job with its optional profile fields, read the profile snapshot skill map/risk signals, retain the three lowest mastery records, and build candidate contexts in this order:

1. role category + lowest mastery tag + highest weighted JD focus;
2. role category + next mastery/JD focus;
3. role category only;
4. curated public questions.

Use a helper to normalize visible tags and select only non-empty focus values. Keep recent question IDs in every candidate query. Build the `reason` from the actual selected signals, with explicit fallbacks when a source is unavailable.

- [ ] **Step 4: Make the existing recommendation cards explain the signals**

Change the copy to show `为什么推荐` and a compact `岗位匹配 / 薄弱项 / 近期未覆盖` line based on `recommendation.reason`; keep the “自主选题” path unchanged. Add responsive spacing so the explanation does not collapse into the CTA on narrow screens.

- [ ] **Step 5: Run backend recommendation tests and user-portal lint**

Run the commands from Step 2 and:

```powershell
pnpm --filter @interview-agent/user-portal exec eslint src/components/questions/QuestionRecommendationBanner.tsx src/components/home/question-hub/AgentRecommendationRail.tsx
```

Expected: PASS.

### Task 5: 完成验证与真实业务 smoke test

**Files:**

- No new source files; only adjust touched files if verification exposes a task-scoped defect.

- [ ] **Step 1: Run focused tests together**

```powershell
pnpm --filter @interview-agent/product-api test --runInBand src/modules/practice/practice-completion.service.spec.ts src/modules/practice/practice-recommendation.service.spec.ts
pnpm --filter @interview-agent/user-portal test --run src/components/practice/player/practice-player-model.test.ts
```

- [ ] **Step 2: Run typecheck, lint, build and diff checks for affected packages**

```powershell
pnpm --filter @interview-agent/product-api typecheck
pnpm --filter @interview-agent/product-api lint
pnpm --filter @interview-agent/product-api build
pnpm --filter @interview-agent/user-portal typecheck
pnpm --filter @interview-agent/user-portal lint
pnpm --filter @interview-agent/user-portal build
git diff --check
```

Report any pre-existing unrelated failures separately; do not reformat or reset unrelated files.

- [ ] **Step 3: Verify the real user flow in the local browser**

With the existing local services running, verify:

1. enter a recommended practice session;
2. save all answers without evaluating each item;
3. click `生成 AI 复盘` and confirm the native confirmation prompt mentions pending count and model quota;
4. cancel once and verify no submit request/state transition;
5. confirm once and verify progress, report-ready state, report display and mastery refresh;
6. return to question selection and verify the recommendation reason reflects the updated weakness and avoids the just-completed question IDs.

Capture the final user-visible state and record any environment limitation if a model credential or local API is unavailable.
