# 后端架构与数据完整性优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变现有 HTTP API 或共享 contracts 的前提下，收敛 Product API 的高风险写路径，并用数据库约束保证租户、题目来源和认证关联的一致性。

**Architecture:** 保留模块化单体与直接 Prisma 读模型；只将多表、状态机和可重试写入收敛到命令服务/事务边界。Interview 专属实时总线归属 Interview 模块，Practice 采用命令/查询分离；Schema 通过复合外键表达同租户关系，公共题引用单独记录题目来源租户。

**Tech Stack:** NestJS 11、TypeScript 5、Prisma 6、PostgreSQL 16 + pgvector、Jest。

## Global Constraints

- 不修改 `packages/contracts`、公开路由、请求/响应字段或新增 `Idempotency-Key` 要求。
- 不触碰工作区中已有的 `apps/product-api/src/common/authn/local-auth.input.ts` 与其测试改动。
- 迁移必须可对已有数据安全回填：新增列先可空，回填并检查，最后收紧为非空/外键。
- 不改变“任意 `visibility=public` 题目可用于练习”的现有产品语义；仅保存其来源租户并强制外键。
- 不改变候选题按现有标题规则复用已发布题目的行为；并发保护只保证事务一致性。
- 所有新写路径先以失败测试覆盖，再写最小实现；最终以 Prisma 迁移、Product API 测试、类型检查和 lint 验证。

---

## 文件结构

| 文件                                                                                                          | 职责                                                                                                           |
| ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `apps/product-api/prisma/schema/{identity,content,local-auth}.prisma`                                         | 声明复合关系、来源租户和匹配热点查询的索引。                                                                   |
| `apps/product-api/prisma/schema/migrations/*/migration.sql`                                                   | 回填现有数据、预检、替换旧外键并建立索引；为候选题持久化审计 revision，并用 trigger 持续保护跨租户公共题边界。 |
| `apps/product-api/src/common/authn/identity-provisioner.ts`                                                   | 将已验证身份映射为 Actor，仅在缺失或声明变化时落库。                                                           |
| `apps/product-api/src/common/authn/auth-identity.service.ts`                                                  | 只负责从请求验证并解析 claims，再委托身份建档。                                                                |
| `apps/product-api/src/modules/interview/realtime/interview-event.bus.ts`                                      | Interview 专属 SSE/Redis 重放总线。                                                                            |
| `apps/product-api/src/modules/practice/{practice.service,practice-command.service,practice-query.service}.ts` | Practice facade、状态写命令与只读查询分离。                                                                    |
| `apps/product-api/src/modules/content-review/*`                                                               | 候选题审核/发布写工作流，Admin 仅保留路由与读模型。                                                            |
| `apps/product-api/src/**/*.spec.ts`                                                                           | 身份、Practice 并发、候选题租户边界和实时总线的回归测试。                                                      |

### Task 1: 先以迁移测试锁定租户关联和公共题来源

**Files:**

- Create: `apps/product-api/src/common/database/data-integrity.integration.spec.ts`
- Modify: `apps/product-api/prisma/schema/content.prisma`
- Modify: `apps/product-api/prisma/schema/identity.prisma`
- Modify: `apps/product-api/prisma/schema/local-auth.prisma`
- Create: `apps/product-api/prisma/schema/migrations/20260714180000_backend_architecture_data_integrity/migration.sql`

**Interfaces:**

- Consumes: 现有 `Tenant`, `User`, `Question`, `KnowledgeAsset`, `ImportTask`, `PracticeSession`, `PracticeSessionItem`。
- Produces: `KnowledgeChunk.tenantId`、`PracticeSessionItem.questionTenantId`，以及所有相关复合外键。

- [x] **Step 1: 写会失败的数据库集成测试**

新增 `data-integrity.integration.spec.ts`，沿用 `RUN_DATABASE_INTEGRATION === 'true'` 开关和 Interview 集成测试的随机租户夹具。覆盖下列断言：

```ts
await expect(
  prisma.practiceSessionItem.create({
    data: {
      tenantId: consumerTenantId,
      sessionId,
      questionTenantId: sourceTenantId,
      questionId,
      sequence: 1,
    },
  }),
).resolves.toMatchObject({ questionTenantId: sourceTenantId });

await expect(
  prisma.importTask.create({
    data: { tenantId: consumerTenantId, assetId: foreignAssetId, title: 'invalid' },
  }),
).rejects.toMatchObject({ code: 'P2003' });
```

另建一条 `LocalCredential`，使其 `tenantId` 与 `userId` 来自不同租户，并断言被拒绝。

- [x] **Step 2: 运行测试确认因 Schema 尚未表达复合关系而失败**

运行：

```powershell
$env:RUN_DATABASE_INTEGRATION='true'; pnpm --filter @interview-agent/product-api test -- data-integrity.integration.spec.ts
```

预期：编译失败（新 `questionTenantId` 字段不存在）或第一个跨租户写入没有被拒绝。

- [x] **Step 3: 在 Prisma Schema 中声明来源和同租户复合关系**

在 `content.prisma` 中完成以下关系：

```prisma
model KnowledgeChunk {
  id        String   @id @default(cuid())
  tenantId  String
  assetId   String
  // ...
  tenant Tenant         @relation(fields: [tenantId], references: [id])
  asset  KnowledgeAsset @relation(fields: [tenantId, assetId], references: [tenantId, id])

  @@index([tenantId, assetId])
}

model PracticeSessionItem {
  id               String @id @default(cuid())
  tenantId         String
  sessionId        String
  questionTenantId String
  questionId       String
  // ...
  question Question @relation(fields: [questionTenantId, questionId], references: [tenantId, id])

  @@unique([tenantId, id])
  @@index([questionTenantId, questionId])
}
```

将 `ImportTask.asset`、`CandidateQuestion.importTask`、`CandidateQuestion.publishedQuestion`、`EvaluationResult.sessionItem`、`PracticeReport.session` 改为使用 `[tenantId, foreignId]` 引用。为 `KnowledgeAsset`、`ImportTask` 和 `PracticeSessionItem` 添加供外键使用的 `@@unique([tenantId, id])`；在 `Tenant`/`User` 添加 `LocalCredential` 反向关系，并让 `LocalCredential` 使用 `[tenantId, userId] -> User[tenantId, id]`。

为已存在的固定上限列表查询补三个 btree 索引：`Question @@index([tenantId, updatedAt])`、`CandidateQuestion @@index([tenantId, createdAt])` 与 `ImportTask @@index([tenantId, updatedAt])`。不在缺少 `EXPLAIN (ANALYZE, BUFFERS)` 证据时增加 GIN 或更多推测性索引。

保留 `LocalCredential.email @unique`，因为现有登录只有邮箱而没有租户选择器。

- [x] **Step 4: 编写可安全部署的 SQL 迁移**

迁移按以下顺序执行：

```sql
ALTER TABLE "KnowledgeChunk" ADD COLUMN "tenantId" TEXT;
UPDATE "KnowledgeChunk" AS chunk
SET "tenantId" = asset."tenantId"
FROM "KnowledgeAsset" AS asset
WHERE asset.id = chunk."assetId";

ALTER TABLE "PracticeSessionItem" ADD COLUMN "questionTenantId" TEXT;
UPDATE "PracticeSessionItem" AS item
SET "questionTenantId" = question."tenantId"
FROM "Question" AS question
WHERE question.id = item."questionId";
```

在设为非空前，用 `DO $$ ... RAISE EXCEPTION ... $$` 检查上述回填不存在 `NULL`。随后创建复合唯一索引、删除旧单列外键、添加新的复合外键；`CandidateQuestion.importTask` 与 `publishedQuestion` 的复合外键使用 `ON DELETE RESTRICT`，避免对必填 `tenantId` 的 `SET NULL` 操作。

- [x] **Step 5: 让新增引用使用复合 connect 键**

修改 `practice-mappers.ts` 和 `import.service.ts`，使其写入新字段：

```ts
question: {
  connect: {
    tenantId_id: { tenantId: question.tenantId, id: question.id },
  },
},

data: candidates.map((candidate, index) => ({
  tenantId: input.tenantId,
  assetId: input.assetId,
  content: candidate.sourceContent,
  metadata: jsonValue({ sequence: index + 1, extractionMode: 'deterministic_fallback' }),
})),
```

同时将 `selectQuestions` 的选择字段保留 `tenantId`，而不是只返回 `id`。

- [x] **Step 6: 应用迁移、生成 Prisma Client 并验证集成测试转绿**

运行：

```powershell
pnpm db:validate
pnpm db:generate
pnpm db:migrate:deploy
$env:RUN_DATABASE_INTEGRATION='true'; pnpm --filter @interview-agent/product-api test -- data-integrity.integration.spec.ts
```

预期：Schema 有效；迁移后跨租户 ImportTask/LocalCredential 被 `P2003` 拒绝；公共题仍可被不同租户的 PracticeSessionItem 引用，且来源租户可读回。

### Task 2: 解耦 Interview 专属实时总线

**Files:**

- Move: `apps/product-api/src/common/events/interview-event.bus.ts` → `apps/product-api/src/modules/interview/realtime/interview-event.bus.ts`
- Move: `apps/product-api/src/common/events/interview-event.bus.spec.ts` → `apps/product-api/src/modules/interview/realtime/interview-event.bus.spec.ts`
- Create: `apps/product-api/src/modules/interview/interview.module.spec.ts`
- Modify: `apps/product-api/src/common/common.module.ts`
- Modify: `apps/product-api/src/modules/interview/interview.module.ts`
- Modify: `apps/product-api/src/modules/interview/interview-command.repository.ts`
- Modify: `apps/product-api/src/modules/interview/interview-query.service.ts`

**Interfaces:**

- Consumes: `PrismaService`, `RedisService`, `AgentStreamEvent`。
- Produces: 仅由 `InterviewModule` 注入的 `InterviewEventBus`；方法签名保持 `publishMany()` 与 `stream()` 不变。

- [x] **Step 1: 记录并运行既有行为测试作为重构基线**

`InterviewEventBus` 是纯归属重构，不新增行为；先运行现有测试，记录 Redis 发布失败仍不阻断事件持久化、断线后按数据库 sequence 重放、重复 sequence 不重复推送三个基线行为。

```powershell
pnpm --filter @interview-agent/product-api test -- interview-event.bus.spec.ts
```

- [x] **Step 2: 移动实现与测试，并调整模块 provider**

从 `CommonModule` 的 provider/export 列表删除 `InterviewEventBus`，在 `InterviewModule` providers 中注册它。将两处 Interview 消费者改为：

```ts
import { InterviewEventBus } from './realtime/interview-event.bus';
```

实时总线内部改用同级 `../interview.mapper`，不再从 `common` 反向引用业务模块。

- [x] **Step 3: 运行实时模块测试与模块装配验证**

新增一个只验证 Nest 注入边界的 `interview.module.spec.ts`，它构造 `TestingModule` 并断言：

```ts
expect(module.get(InterviewEventBus)).toBeInstanceOf(InterviewEventBus);
```

然后运行：

```powershell
pnpm --filter @interview-agent/product-api test -- interview-event.bus.spec.ts interview.module.spec.ts
```

预期：所有事件流测试通过，`InterviewModule` 独立提供总线，且 Product API 编译不再从 `common/events` 导入 Interview 类型。

### Task 3: 分离身份校验与按需身份建档

**Files:**

- Create: `apps/product-api/src/common/authn/identity-provisioner.ts`
- Create: `apps/product-api/src/common/authn/identity-provisioner.spec.ts`
- Modify: `apps/product-api/src/common/authn/auth-identity.service.ts`
- Modify: `apps/product-api/src/common/common.module.ts`

**Interfaces:**

- Consumes: 经 JWT/OIDC/development 验证的 `{ sub, tenant_id, role, email?, name? }`。
- Produces: `Actor`，并保证稳定 claims 的请求不执行 `upsert`/`update`。

- [x] **Step 1: 编写 provisioner 的失败测试**

用最小 Prisma mock 覆盖：

```ts
it('does not write for an unchanged provisioned identity', async () => {
  database.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });
  database.user.findUnique.mockResolvedValue(existingUser);

  await provisioner.resolve(claims);

  expect(database.$transaction).not.toHaveBeenCalled();
  expect(database.user.update).not.toHaveBeenCalled();
});
```

另覆盖 claim 缺少 `email/name` 时保留存量字段，以及角色或具名 claim 改变时仅更新变化字段。

- [x] **Step 2: 运行测试确认 `IdentityProvisioner` 尚不存在**

运行：

```powershell
pnpm --filter @interview-agent/product-api test -- identity-provisioner.spec.ts
```

预期：模块不存在或断言失败。

- [x] **Step 3: 实现读优先的身份建档器**

实现以下决策：

```ts
const tenant = await this.prisma.tenant.findUnique({
  where: { slug: identity.tenant_id },
  select: { id: true },
});
if (!tenant) return this.createTenantAndUser(identity);

const user = await this.prisma.user.findUnique({
  where: { tenantId_subject: { tenantId: tenant.id, subject: identity.sub } },
  select: { id: true, subject: true, tenantId: true, role: true, email: true, name: true },
});
if (!user) return this.createUser(tenant.id, identity);
if (hasIdentityChanges(user, identity)) return this.updateChangedUser(user, identity);
return actorFromIdentity(user);
```

创建路径放在单个可重试事务中；更新 payload 仅包含变化字段，且缺失的可选 claim 不写入 `null`。`AuthIdentityService.resolve()` 保留认证职责，只改为调用 provisioner。

- [x] **Step 4: 在 CommonModule 注册 provider 并转绿测试**

运行：

```powershell
pnpm --filter @interview-agent/product-api test -- identity-provisioner.spec.ts local-auth.service.spec.ts
```

预期：稳定身份不产生写调用，声明变化可同步，现有本地登录会话测试不回归。

### Task 4: 将 Practice 的状态写入收敛为可串行化命令

**Files:**

- Create: `apps/product-api/src/modules/practice/practice-command.service.ts`
- Create: `apps/product-api/src/modules/practice/practice-query.service.ts`
- Create: `apps/product-api/src/modules/practice/practice-command.integration.spec.ts`
- Modify: `apps/product-api/src/modules/practice/practice.service.ts`
- Modify: `apps/product-api/src/modules/practice/practice.module.ts`
- Modify: `apps/product-api/src/modules/practice/practice-mappers.ts`

**Interfaces:**

- Consumes: `ProductRequestContext`, `CreatePracticeSession`, `SubmitPracticeAnswer`, `runSerializable`。
- Produces: `PracticeService` 保持现有 controller 调用签名；命令服务只处理 `create`、`submitAnswer`、`submit`，查询服务处理 `get`、`getReport`、`mastery`。

- [x] **Step 1: 写两个会失败的数据库并发测试**

在 `practice-command.integration.spec.ts` 建立随机租户、用户、题目、session。测试：

```ts
const results = await Promise.allSettled([
  commands.submit(context, sessionId),
  commands.submit(context, sessionId),
]);

expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(2);
expect(await prisma.practiceReport.count({ where: { sessionId } })).toBe(1);
expect(await prisma.evaluationResult.count({ where: { tenantId } })).toBe(questionCount);
```

并行提交两个不同 session、但包含相同 tag 的题目，断言 `MasteryProfile.evidenceCount` 等于两次证据总数。另加一条：报告生成后提交答案返回 `PRACTICE_SESSION_CLOSED`。

- [x] **Step 2: 运行并发测试确认现状失败**

运行：

```powershell
$env:RUN_DATABASE_INTEGRATION='true'; pnpm --filter @interview-agent/product-api test -- practice-command.integration.spec.ts
```

预期：至少一个同 session 提交出现 `P2002` 或提交后的状态/掌握度断言不成立。

- [x] **Step 3: 实现 Command/Query 分离并使用 `runSerializable`**

将现有读方法移入 `PracticeQueryService`。在 `PracticeCommandService.submit()` 内部在同一个 `runSerializable` 回调中：加载带 items/report 的 session、校验所有答案、用状态条件抢占会话、评估、更新 mastery、创建报告并将状态改为 `report_ready`。

核心状态占用为：

```ts
const claimed = await transaction.practiceSession.updateMany({
  where: { id: sessionId, tenantId, status: 'in_progress' },
  data: { status: 'submitted', submittedAt: new Date() },
});
if (claimed.count === 0) {
  const latest = await loadSession(transaction, tenantId, sessionId);
  if (latest.report) return mapReport(latest.report, latest.items);
  throw new ConflictException({ code: 'PRACTICE_SESSION_CLOSED' });
}
```

`submitAnswer()` 也在串行化事务中重新加载 session，再写 item，避免报告落库后旧请求修改答案。`PracticeService` 变成与 `InterviewService` 同样的 facade，controller 签名不变。

- [x] **Step 4: 运行新增与现有 Practice 测试**

运行：

```powershell
$env:RUN_DATABASE_INTEGRATION='true'; pnpm --filter @interview-agent/product-api test -- practice-command.integration.spec.ts practice-evaluator.spec.ts public-practice-questions.spec.ts
```

预期：重复交卷幂等返回同一报告；并发掌握度无丢失更新；原有评估逻辑通过。

### Task 5: 将候选题审核工作流移出 Admin，并收紧发布事务

**Files:**

- Create: `apps/product-api/src/modules/content-review/content-review.module.ts`
- Move: `apps/product-api/src/modules/admin/candidate-review.service.ts` → `apps/product-api/src/modules/content-review/candidate-review.service.ts`
- Create: `apps/product-api/src/modules/content-review/candidate-review.service.spec.ts`
- Modify: `apps/product-api/src/modules/admin/admin.module.ts`
- Modify: `apps/product-api/src/modules/admin/admin.controller.ts`

**Interfaces:**

- Consumes: 现有 `CandidateQuestionDetail`, `UpdateCandidateQuestionInput`, `PublishCandidateQuestionInput`。
- Produces: 现有 Admin HTTP 路由和返回结构不变；Candidate Review 使用串行化事务与同租户 published-question 查询。

- [x] **Step 1: 写审核事务回归测试**

覆盖下列行为：

```ts
await expect(
  service.publish(context, candidateId, { visibility: 'tenant' }),
).resolves.toMatchObject({
  tenantId: context.tenantId,
});

await expect(service.detail(otherTenantContext, candidateId)).rejects.toMatchObject({
  response: expect.objectContaining({ code: 'CANDIDATE_QUESTION_NOT_FOUND' }),
});
```

还要断言已发布的 Candidate 重试发布返回已关联的同租户 Question，且加载该 Question 时 where 条件同时包含 `tenantId` 与 `id`。

- [x] **Step 2: 运行测试确认移动前模块不可解析或租户条件未被覆盖**

运行：

```powershell
pnpm --filter @interview-agent/product-api test -- candidate-review.service.spec.ts
```

预期：新模块不存在或租户安全断言失败。

- [x] **Step 3: 移动 workflow，并用串行化事务替代普通事务**

在新模块注册 `CandidateReviewService` 并导出它；`AdminModule` 导入 `ContentReviewModule`。将 `update`/`publish` 的 `$transaction` 改为 `runSerializable(this.prisma, ...)`，并将已发布题查询改为：

```ts
transaction.question.findUnique({
  where: { tenantId_id: { tenantId, id: questionId } },
});
```

保留现有 `findOrCreateQuestion()` 的标题复用语义，不新加来源唯一键或改变 public 题发布权限。

- [x] **Step 4: 验证模块与审核测试**

运行：

```powershell
pnpm --filter @interview-agent/product-api test -- candidate-review.service.spec.ts
pnpm --filter @interview-agent/product-api typecheck
```

预期：Admin controller 仍可注入审核 workflow；跨租户查询不会返回题目；类型检查通过。

### Task 6: 修正文档、检查迁移并做最终验证

**Files:**

- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-07-14-backend-architecture-data-integrity.md`

- [x] **Step 1: 修正 README 的迁移目录**

将数据库章节中的迁移路径改为：

```text
apps/product-api/prisma/schema/migrations/
```

不改变现有 `pnpm db:*` 命令。

- [x] **Step 2: 检查迁移 SQL 的回填与约束顺序**

确认迁移包含：可空新增列、两条 join 回填、NULL 预检、旧 FK 删除、新复合 FK 添加、匹配索引建立。使用：

```powershell
pnpm db:validate
pnpm db:generate
pnpm db:migrate:deploy
```

预期：数据库状态为 up to date，且无 schema drift。

- [x] **Step 3: 跑与本次改动直接相关的完整 Product API 验证**

运行：

```powershell
$env:RUN_DATABASE_INTEGRATION='true'; pnpm --filter @interview-agent/product-api test
pnpm --filter @interview-agent/product-api typecheck
pnpm --filter @interview-agent/product-api lint
pnpm format:check
```

预期：全部命令退出码为 0；如 Docker/PostgreSQL 不可用，明确记录受限命令及其他已完成验证。

执行记录（2026-07-14）：Product API 完整测试、类型检查、lint、build 与数据库迁移验证均已通过。全仓 `pnpm format:check` 仍由工作区中 72 个不属于本计划的前端/既有后端文件阻断；本计划覆盖文件的定向 Prettier 检查已通过，未改动这些无关文件。

- [x] **Step 4: 对照需求逐项复核**

确认：无公共 API/contracts 改动；公共题仍可跨租户引用但来源被记录；身份稳定请求不写库；Practice 双提交/并发掌握度已覆盖；EventBus 不再由 `CommonModule` 导出；本地认证输入规则的既有未提交改动未被修改。

## 审查收尾修正（已完成）

- 新增 `CandidateQuestion.revision` 与迁移 `20260714190000_candidate_question_revision`；审核日志中的 `stateTransition.version` 现在来自实际持久化的递增值。
- 新增 `20260714191000_enforce_cross_tenant_practice_question_visibility`；它会预检历史数据，并通过双向 trigger 持续保证跨租户练习项只能引用 `public + published` 的题目。
- `runSerializable` 现在对“事务尚未启动”的 Prisma `P2028` 做有限重试，覆盖受限连接池下的首次身份建档和候选题并发发布。
