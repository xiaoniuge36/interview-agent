# 候选题按来源批量审核 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让管理端审核人员识别候选题来源导入文件，并在同一来源资料内安全地批量通过、需修改或驳回候选题。

**Architecture:** 扩展共享候选题摘要合约以携带可空的导入任务摘要；Product API 的列表查询通过 Prisma 关联来源任务并映射摘要。新增原子批量审核命令，服务端统一校验租户、未发布状态和同来源约束后写入每题审计记录；管理端通过表格多选、批量操作栏和状态按钮消费该接口。

**Tech Stack:** TypeScript、NestJS 11、Prisma 6、Zod、React 18、Ant Design 6、Jest、Vitest。

## 执行收尾（2026-07-22）

- 当前实现已覆盖候选题来源、批量审核/发布与管理端操作；合同测试、API 定向 Jest 测试和管理端定向测试均已通过。
- Product API 的标准 `pnpm test` 仍待补跑：运行中的 `product-api dev` 占用 Prisma 引擎，导致其前置 `prisma generate` 在 Windows 上报 `EPERM`。

## Global Constraints

- 批量审核只支持 `approved`、`needs_edit`、`rejected`，不支持批量发布。
- 单次批量操作中的候选题 ID 必须不重复、同租户、未发布且拥有相同的 `importTaskId`；校验失败不写入任何记录。
- API 失败继续使用管理端现有的全局 Ant Design message 提示。
- 不修改 Prisma schema、不新增依赖、不提交或推送 Git 历史，除非用户另行要求。

---

### Task 1: 扩展候选题来源与批量审核共享合约

**Files:**

- Modify: `packages/contracts/src/schemas/training.ts`
- Modify: `packages/contracts/src/schemas/training.test.ts`

**Interfaces:**

- Produces: `CandidateImportSourceSchema`、`BatchCandidateReviewInputSchema`、`CandidateReview.sourceImport`、`BatchCandidateReviewInput`。
- Consumes: 现有 `CandidateReviewStatusSchema` 与 `CONTRACT_LIMITS`。

- [ ] **Step 1: 写出合约失败测试**

```ts
it('accepts a same-source batch review command and exposes a source title', () => {
  expect(
    CandidateReviewSchema.parse({
      ...candidateReview,
      sourceImport: { id: 'import-1', title: 'Java 面试资料.md' },
    }).sourceImport,
  ).toEqual({ id: 'import-1', title: 'Java 面试资料.md' });
  expect(
    BatchCandidateReviewInputSchema.parse({
      candidateIds: ['candidate-1', 'candidate-2'],
      status: 'approved',
      reviewNotes: '答案与原文一致。',
    }),
  ).toMatchObject({ status: 'approved' });
});

it('rejects pending status and an empty batch', () => {
  expect(() =>
    BatchCandidateReviewInputSchema.parse({ candidateIds: [], status: 'pending' }),
  ).toThrow();
});
```

- [ ] **Step 2: 运行失败测试**

Run: `pnpm --filter @interview-agent/contracts test -- training.test.ts`

Expected: FAIL，因为 `sourceImport` 与 `BatchCandidateReviewInputSchema` 尚未定义。

- [ ] **Step 3: 实现最小合约**

```ts
export const CandidateImportSourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(CONTRACT_LIMITS.shortText),
});

export const BatchCandidateReviewInputSchema = z.object({
  candidateIds: z.array(z.string().min(1)).min(1).max(CONTRACT_LIMITS.list),
  status: CandidateReviewStatusSchema.exclude(['pending']),
  reviewNotes: z.string().max(CONTRACT_LIMITS.mediumText).nullable(),
});

export const CandidateReviewSchema = z.object({
  id: z.string().min(1),
  importTaskId: z.string().min(1).nullable(),
  title: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  status: CandidateReviewStatusSchema,
  qualityScore: z.number().min(0).max(CONTRACT_LIMITS.percentage),
  tags: z.array(z.string().max(CONTRACT_LIMITS.shortText)).max(CONTRACT_LIMITS.tags),
  sourceRefs: z.array(z.string().max(CONTRACT_LIMITS.mediumText)).max(CONTRACT_LIMITS.list),
  createdAt: z.string().datetime(),
  sourceImport: CandidateImportSourceSchema.nullable(),
});
```

- [ ] **Step 4: 运行合约测试**

Run: `pnpm --filter @interview-agent/contracts test -- training.test.ts`

Expected: PASS，来源摘要、空来源和批量审核状态边界均被验证。

### Task 2: 在 Product API 查询中关联并映射来源导入文件

**Files:**

- Modify: `apps/product-api/src/modules/admin/admin-query.service.ts`
- Modify: `apps/product-api/src/modules/admin/admin-query-mapping.ts`
- Modify: `apps/product-api/src/modules/admin/admin-query.service.spec.ts`

**Interfaces:**

- Consumes: `CandidateReviewSchema` 的 `sourceImport` 字段。
- Produces: `GET /api/admin/candidates/query` 中每条候选题的 `{ sourceImport: { id, title } | null }`。

- [ ] **Step 1: 写出列表来源关联失败测试**

```ts
prisma.candidateQuestion.findMany.mockResolvedValue([
  candidateRecord({ importTask: { id: 'import-1', title: 'Java 面试资料.md' } }),
]);

await expect(service.queryCandidates(context, query)).resolves.toMatchObject({
  items: [{ sourceImport: { id: 'import-1', title: 'Java 面试资料.md' } }],
});

expect(prisma.candidateQuestion.findMany).toHaveBeenCalledWith(
  expect.objectContaining({
    include: { importTask: { select: { id: true, title: true } } },
  }),
);
```

- [ ] **Step 2: 运行失败测试**

Run: `pnpm --filter @interview-agent/product-api test -- admin-query.service.spec.ts`

Expected: FAIL，因为查询未 include `importTask`，映射结果也没有 `sourceImport`。

- [ ] **Step 3: 实现关联和映射**

```ts
const CANDIDATE_WITH_SOURCE = {
  include: { importTask: { select: { id: true, title: true } } },
} as const;

load: (skip, take) => this.prisma.candidateQuestion.findMany({
  where, orderBy: CREATED_ORDER, skip, take, ...CANDIDATE_WITH_SOURCE,
}),

export function mapCandidate(record: CandidateWithSource): CandidateReview {
  return CandidateReviewSchema.parse({
    ...record,
    sourceImport: record.importTask ? { id: record.importTask.id, title: record.importTask.title } : null,
    createdAt: record.createdAt.toISOString(),
  });
}
```

- [ ] **Step 4: 运行 Product API 列表测试**

Run: `pnpm --filter @interview-agent/product-api test -- admin-query.service.spec.ts`

Expected: PASS，查询和导出各自维持既有行为，分页列表带来源标题。

### Task 3: 实现原子的同源批量审核命令

**Files:**

- Modify: `apps/product-api/src/modules/admin/admin.controller.ts`
- Modify: `apps/product-api/src/modules/content-review/candidate-review.service.ts`
- Modify: `apps/product-api/src/modules/content-review/candidate-review.service.spec.ts`

**Interfaces:**

- Consumes: `BatchCandidateReviewInput` 和 `candidate:review` 权限。
- Produces: `PATCH /api/admin/candidates/batch-review`，返回 `{ updatedCount: number }`。

- [ ] **Step 1: 写出服务失败测试**

```ts
await expect(
  service.batchReview(context, {
    candidateIds: ['candidate-1', 'candidate-2'],
    status: 'approved',
    reviewNotes: '内容准确。',
  }),
).resolves.toEqual({ updatedCount: 2 });

expect(database.transaction.candidateQuestion.update).toHaveBeenCalledWith({
  where: { id: 'candidate-1' },
  data: { status: 'approved', reviewNotes: '内容准确。', revision: { increment: 1 } },
});

await expect(
  service.batchReview(context, {
    candidateIds: ['candidate-1', 'candidate-3'],
    status: 'rejected',
  }),
).rejects.toBeInstanceOf(BadRequestException);
```

- [ ] **Step 2: 运行失败测试**

Run: `pnpm --filter @interview-agent/product-api test -- candidate-review.service.spec.ts`

Expected: FAIL，因为 `batchReview` 尚未实现。

- [ ] **Step 3: 添加控制器路由与服务实现**

```ts
@Patch('candidates/batch-review')
batchReview(@Req() request: ProductRequest, @Body() body: unknown) {
  return this.candidatesService.batchReview(
    request.context,
    BatchCandidateReviewInputSchema.parse(body),
  );
}
```

```ts
async batchReview(context: ProductRequestContext, input: BatchCandidateReviewInput) {
  this.assertReviewPermission(context);
  return runSerializable(this.prisma, async (transaction) => {
    const candidates = await transaction.candidateQuestion.findMany({
      where: { tenantId: context.tenantId, id: { in: input.candidateIds } },
    });
    assertBatchReviewable(candidates, input.candidateIds);
    await Promise.all(candidates.map(async (candidate) => {
      const updated = await transaction.candidateQuestion.update({
        where: { id: candidate.id },
        data: { status: input.status, reviewNotes: input.reviewNotes ?? null, revision: { increment: 1 } },
      });
      await this.audit.record(context, {
        action: 'candidate:review', resourceType: 'CandidateQuestion', resourceId: candidate.id,
        stateTransition: { from: candidate.status, to: updated.status, version: updated.revision },
      }, transaction);
    }));
    return { updatedCount: candidates.length };
  });
}
```

- [ ] **Step 4: 校验缺失、已发布和跨来源边界**

`assertBatchReviewable` 必须在写入前检查：查询数量等于去重后的 ID 数量、每条 `publishedQuestionId` 为 null、以及所有 `importTaskId` 相同。失败时抛出 `BadRequestException` 或 `ConflictException`，且测试断言 `update` 和 `audit.record` 均未调用。

- [ ] **Step 5: 运行服务与控制器回归测试**

Run: `pnpm --filter @interview-agent/product-api test -- candidate-review.service.spec.ts admin.controller.spec.ts`

Expected: PASS，批量成功、跨来源拒绝、已发布拒绝和既有单题审核均通过。

### Task 4: 接入管理端批量审核 API 与来源展示

**Files:**

- Modify: `apps/admin-console/src/lib/training-content-api.ts`
- Modify: `apps/admin-console/src/lib/training-content-api.test.ts`
- Modify: `apps/admin-console/src/components/dashboard/CandidateReviewQueue.tsx`
- Create: `apps/admin-console/src/components/dashboard/candidate-batch-review.ts`
- Create: `apps/admin-console/src/components/dashboard/candidate-batch-review.test.ts`
- Modify: `apps/admin-console/src/app/styles/antd-admin.css`

**Interfaces:**

- Consumes: `BatchCandidateReviewInputSchema`、列表项的 `sourceImport`、`PATCH /admin/candidates/batch-review`。
- Produces: `batchReviewCandidates(input)` 与同源选择状态 `{ ids, sourceImport, canSubmit }`。

- [ ] **Step 1: 写出失败测试**

```ts
expect(
  resolveBatchReviewSelection([
    candidate('candidate-1', 'import-1', 'Java 面试资料.md'),
    candidate('candidate-2', 'import-1', 'Java 面试资料.md'),
  ]),
).toEqual({
  canSubmit: true,
  sourceImport: { id: 'import-1', title: 'Java 面试资料.md' },
});

expect(
  resolveBatchReviewSelection([
    candidate('candidate-1', 'import-1', 'Java 面试资料.md'),
    candidate('candidate-2', 'import-2', 'Go 面试资料.md'),
  ]).canSubmit,
).toBe(false);
```

```ts
expect(
  createBatchReviewRequest({ candidateIds: ['candidate-1'], status: 'approved' }),
).toMatchObject({
  path: '/admin/candidates/batch-review',
  init: { method: 'PATCH' },
});
```

- [ ] **Step 2: 运行失败测试**

Run: `pnpm --filter @interview-agent/admin-console test -- candidate-batch-review.test.ts training-content-api.test.ts`

Expected: FAIL，因为来源选择辅助函数和批量请求工厂尚不存在。

- [ ] **Step 3: 添加 API 请求与选择状态辅助函数**

```ts
export function createBatchReviewRequest(input: BatchCandidateReviewInput) {
  return {
    path: '/admin/candidates/batch-review',
    schema: z.object({ updatedCount: z.number().int().nonnegative() }),
    init: { method: 'PATCH', body: JSON.stringify(BatchCandidateReviewInputSchema.parse(input)) },
  };
}

export function resolveBatchReviewSelection(candidates: CandidateReview[]) {
  const sources = new Map(
    candidates.map((candidate) => [candidate.sourceImport?.id ?? 'none', candidate.sourceImport]),
  );
  return {
    canSubmit: candidates.length > 0 && sources.size === 1,
    sourceImport: sources.values().next().value ?? null,
  };
}
```

- [ ] **Step 4: 改造审核表格**

在 `CandidateReviewQueue` 的 `<Table>` 添加 `rowSelection`，并增加“来源资料”列。表格上方渲染 `BatchReviewBar`：显示已选数量、来源标题、统一审核备注输入与三个状态按钮；当 `canSubmit` 为 false 时显示 `Alert type="warning"` 并禁用按钮。批量请求成功后清空 selected row keys，并依次调用 `list.reload()` 与 `onChanged()`。

来源单元格固定使用：

```tsx
{
  candidate.sourceImport ? (
    <Space direction="vertical" size={0}>
      <Typography.Text>{candidate.sourceImport.title}</Typography.Text>
      <Typography.Text code type="secondary">
        {candidate.sourceImport.id}
      </Typography.Text>
    </Space>
  ) : (
    <Typography.Text type="secondary">非导入来源</Typography.Text>
  );
}
```

- [ ] **Step 5: 运行管理端定向测试**

Run: `pnpm --filter @interview-agent/admin-console test -- candidate-batch-review.test.ts training-content-api.test.ts`

Expected: PASS，同源多选可提交、跨来源多选被阻断，且批量请求路径与请求体正确。

### Task 5: 改造单题审核状态控件与来源入口

**Files:**

- Modify: `apps/admin-console/src/components/dashboard/training-content/CandidateEditor.tsx`
- Modify: `apps/admin-console/src/components/dashboard/training-content/CandidateForm.tsx`
- Modify: `apps/admin-console/src/components/dashboard/training-content/types.ts`
- Create: `apps/admin-console/src/components/dashboard/training-content/CandidateForm.test.tsx`

**Interfaces:**

- Consumes: `CandidateQuestionDetail.importTaskId`、`getImportReviewContext(taskId)`。
- Produces: 无下拉框的单题状态按钮和来源资料展示。

- [ ] **Step 1: 写出失败的静态渲染测试**

```tsx
const markup = renderToStaticMarkup(createElement(CandidateForm, props));
expect(markup).not.toContain('ant-select');
expect(markup).toContain('通过');
expect(markup).toContain('需修改');
expect(markup).toContain('驳回');
```

- [ ] **Step 2: 运行失败测试**

Run: `pnpm --filter @interview-agent/admin-console test -- CandidateForm.test.tsx`

Expected: FAIL，因为当前审核状态使用 Ant Design Select。

- [ ] **Step 3: 使用状态按钮替换下拉框**

```tsx
<Form.Item label="审核结论">
  <Space wrap>
    <Button
      type={detail.status === 'approved' ? 'primary' : 'default'}
      onClick={() => change('status', 'approved')}
    >
      通过
    </Button>
    <Button danger={detail.status === 'rejected'} onClick={() => change('status', 'rejected')}>
      驳回
    </Button>
    <Button
      type={detail.status === 'needs_edit' ? 'primary' : 'default'}
      onClick={() => change('status', 'needs_edit')}
    >
      需修改
    </Button>
  </Space>
</Form.Item>
```

在 `CandidateEditor` 中，当 `detail.importTaskId` 存在时加载 `getImportReviewContext` 并在表单之前展示任务标题、任务 ID 和可展开的原文片段；不存在时显示“非导入来源”。来源读取失败只显示普通空状态，错误由全局 API 提示展示。

- [ ] **Step 4: 运行单题审核测试**

Run: `pnpm --filter @interview-agent/admin-console test -- CandidateForm.test.tsx`

Expected: PASS，抽屉不再渲染下拉框，并包含三个明确状态操作。

### Task 6: 执行跨端验证

**Files:**

- Modify: `docs/superpowers/specs/2026-07-16-batch-candidate-review-design.md`（仅当实现中出现需记录的已确认设计偏差时）

- [ ] **Step 1: 运行契约与 Product API 验证**

Run: `pnpm --filter @interview-agent/contracts test && pnpm --filter @interview-agent/product-api typecheck && pnpm --filter @interview-agent/product-api test`

Expected: 全部通过。

- [ ] **Step 2: 运行管理端验证**

Run: `pnpm --filter @interview-agent/admin-console typecheck && pnpm --filter @interview-agent/admin-console lint && pnpm --filter @interview-agent/admin-console test && pnpm --filter @interview-agent/admin-console build`

Expected: 全部通过，无新增 lint warning。

- [ ] **Step 3: 检查变更边界**

Run: `git diff --check`

Expected: 无空白错误；只涉及候选题审核、共享合约、测试与本次设计/计划文档。
