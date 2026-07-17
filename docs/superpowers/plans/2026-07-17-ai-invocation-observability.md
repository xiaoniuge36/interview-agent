# AI 调用日志与统计看板 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为用户自配模型的真实调用建立安全、可聚合、可追溯的日志，并在用户设置与平台数据看板中提供相应统计。

**Architecture:** 新建 `AiUsageModule` 作为可复用的旁路观测模块，`AiInvocationService.measure()` 在供应商调用边界记录安全元数据和供应商返回的 usage；写入与 90 天清理故障只记服务端日志，绝不影响模型调用、练习持久化或面试命令。共享 contracts 定义用户摘要和平台分析响应，用户 API 严格限制当前 tenant/user，管理端继续使用现有 `analytics:read` + 平台管理员边界。

**Tech Stack:** NestJS 11、Prisma/PostgreSQL、TypeScript、Zod、Next.js 15、React 18、Ant Design、Jest、Vitest。

---

## Global constraints

- 直接在用户已授权的 `main` 工作区修改，不创建分支、不提交、不覆盖无关的脏工作区改动。
- 只保存 provider、model、操作、状态、trace、时延、公开错误码、关联 ID 与供应商已返回的 token usage；禁止保存 API Key、Authorization、prompt、用户回答、completion 或原始响应。
- 日志与过期清理均为旁路能力：日志写入失败、清理失败不得改变用户可见的成功/失败结果。
- `AgentRun` 继续表示面试命令运行质量；`AiInvocation` 表示一次真实模型调用，两者不得互相替代。

## File structure

- `packages/contracts/src/schemas/ai-usage.ts`：时间范围、操作/状态、用户摘要和平台分析 Zod contracts。
- `apps/product-api/prisma/schema/{enums,interview}.prisma`：`AiInvocation` 数据模型、索引和关系；新增迁移。
- `apps/product-api/src/modules/ai-usage/*`：安全日志测量、数据聚合、用户控制器、模块和单元测试。
- `apps/product-api/src/modules/model-credential/*`：解析 OpenAI-compatible/Anthropic usage，并记录连接测试。
- `apps/product-api/src/modules/{practice,agent-runtime}/*`：在真实模型调用边界写入单题评价和面试调用日志。
- `apps/product-api/src/modules/admin/*`：提供平台管理员 AI 分析端点。
- `apps/user-portal/src/{lib,components/settings}/*`：获取并渲染“我的 AI 使用情况”。
- `apps/admin-console/src/{lib,components/dashboard}/*`：获取并渲染“AI 调用洞察”。

### Task 1: 定义安全的跨端 contract 与持久化模型

**Files:**

- Create: `packages/contracts/src/schemas/ai-usage.ts`
- Create: `packages/contracts/src/schemas/ai-usage.test.ts`
- Modify: `packages/contracts/src/index.ts`
- Modify: `apps/product-api/prisma/schema/enums.prisma`
- Modify: `apps/product-api/prisma/schema/interview.prisma`
- Create: `apps/product-api/prisma/schema/migrations/<timestamp>_add_ai_invocation/migration.sql`

- [ ] **Step 1: 写入 contract 失败用例，锁定合法 period、无 token 的摘要和不暴露敏感字段的响应形状。**

```ts
assert.equal(AiUsageSummaryQuerySchema.safeParse({ period: '90d' }).success, false);
assert.equal(AiUsageSummarySchema.parse(summary).recent[0].errorCode, 'MODEL_PROVIDER_RATE_LIMITED');
assert.equal('prompt' in AiUsageSummarySchema.parse(summary).recent[0], false);
```

- [ ] **Step 2: 实现 `today | 7d | 30d` period、三种 operation、三种终态、token/趋势/分组/失败记录 schemas，并从 contracts 根导出。**

```ts
export const AiInvocationOperationSchema = z.enum([
  'model_connection_test',
  'practice_evaluation',
  'interview_next',
]);
export const AiUsageSummaryQuerySchema = z.object({
  period: AiUsagePeriodSchema.default('7d'),
});
```

- [ ] **Step 3: 添加 Prisma 枚举和 `AiInvocation`，仅建立 tenant、user、credential 外键；业务会话字段保留普通 ID。**

```prisma
model AiInvocation {
  id String @id @default(cuid())
  tenantId String
  userId String
  credentialId String?
  operation AiInvocationOperation
  provider String
  model String
  status AiInvocationStatus
  traceId String
  createdAt DateTime @default(now())

  @@index([tenantId, userId, createdAt])
  @@index([tenantId, provider, model, createdAt])
  @@index([tenantId, status, createdAt])
  @@index([traceId])
}
```

- [ ] **Step 4: 生成仅包含上述表、枚举、外键和索引的 SQL migration，并运行 schema format/validate。**

Run: `pnpm --filter @interview-agent/product-api db:format && pnpm --filter @interview-agent/product-api db:validate`

Expected: Prisma schema 格式化且验证通过。

### Task 2: 解析供应商 usage，且不泄露原始 SSE 帧

**Files:**

- Modify: `apps/product-api/src/modules/model-credential/model-provider-stream.ts`
- Modify: `apps/product-api/src/modules/model-credential/model-provider.client.ts`
- Modify: `apps/product-api/src/modules/model-credential/model-provider.client.spec.ts`

- [ ] **Step 1: 为 OpenAI-compatible 完成帧、Anthropic `message_delta.usage`、没有 usage 和流错误前的 usage 回调写失败用例。**

```ts
await collect(client.stream({ ...input, onUsage: usage }));
expect(usage).toHaveBeenLastCalledWith({ inputTokens: 12, outputTokens: 8, totalTokens: 20 });
expect(usage).not.toHaveBeenCalledWith(expect.objectContaining({ raw: expect.anything() }));
```

- [ ] **Step 2: 将 provider SSE parser 提升为安全事件流，供文本 delta 和 usage 共同使用；保留现有只产出文本的 public 行为。**

```ts
export type ProviderStreamEvent =
  | { type: 'text'; value: string }
  | { type: 'usage'; value: ModelTokenUsage };

for await (const event of providerEvents(response.body, input.provider)) {
  if (event.type === 'usage') input.onUsage?.(event.value);
  if (event.type === 'text') yield event.value;
}
```

- [ ] **Step 3: 标准化 `prompt_tokens`/`completion_tokens`/`total_tokens`、缓存/推理明细与 Anthropic input/output/cache-read token，缺失字段保持 `undefined`。**

```ts
export type ModelTokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  reasoningTokens?: number;
  totalTokens?: number;
};
```

- [ ] **Step 4: 运行 provider 定向测试。**

Run: `pnpm --filter @interview-agent/product-api test -- model-provider.client`

Expected: OpenAI-compatible、Anthropic、缺失 usage、无原始 payload 泄露覆盖均通过。

### Task 3: 实现旁路 AI 调用记录与用户摘要

**Files:**

- Create: `apps/product-api/src/modules/ai-usage/ai-invocation.service.ts`
- Create: `apps/product-api/src/modules/ai-usage/ai-invocation.service.spec.ts`
- Create: `apps/product-api/src/modules/ai-usage/ai-usage.service.ts`
- Create: `apps/product-api/src/modules/ai-usage/ai-usage.service.spec.ts`
- Create: `apps/product-api/src/modules/ai-usage/ai-usage.controller.ts`
- Create: `apps/product-api/src/modules/ai-usage/ai-usage.controller.spec.ts`
- Create: `apps/product-api/src/modules/ai-usage/ai-usage.module.ts`

- [ ] **Step 1: 写入测量服务的成功、provider 失败、Abort、记录失败降级和 90 天清理节流测试。**

```ts
await expect(service.measure(metadata, () => Promise.resolve('ok'))).resolves.toBe('ok');
expect(prisma.aiInvocation.create).toHaveBeenCalledWith(
  expect.objectContaining({ data: expect.objectContaining({ status: 'succeeded' }) }),
);
await expect(service.measure(metadata, () => Promise.reject(providerError))).rejects.toBe(providerError);
```

- [ ] **Step 2: 实现 `measure()`，用单次 usage 回调和 `performance.now()` 记录终态；失败只持久化已有公开错误码。**

```ts
async measure<T>(metadata: AiInvocationMetadata, run: (onUsage: UsageHandler) => Promise<T>) {
  const startedAt = new Date();
  const startedAtMs = performance.now();
  try {
    const result = await run((usage) => (observedUsage = usage));
    await this.recordSafely({ ...metadata, status: 'succeeded', startedAt, finishedAt: new Date() });
    return result;
  } catch (error) {
    await this.recordSafely({ ...metadata, status: statusFor(error), errorCode: publicCode(error) });
    throw error;
  }
}
```

- [ ] **Step 3: 实现每天最多一次、删除 90 天前记录的机会性清理，且永远吞掉清理/记录错误并使用 Nest Logger 留痕。**

```ts
if (this.lastCleanupAt && now.getTime() - this.lastCleanupAt.getTime() < DAY_MS) return;
this.lastCleanupAt = now;
await this.prisma.aiInvocation.deleteMany({ where: { createdAt: { lt: cutoff } } });
```

- [ ] **Step 4: 实现当前用户范围的 summary/recent 查询、`GET /ai-usage/summary`，并在查询前检查 `model_credential:read`。**

```ts
@Roles('user')
@Controller('ai-usage')
export class AiUsageController {
  @Get('summary')
  summary(@Req() request: ProductRequest, @Query() query: unknown) {
    return this.service.summary(request.context, AiUsageSummaryQuerySchema.parse(query));
  }
}
```

- [ ] **Step 5: 运行服务和控制器定向测试。**

Run: `pnpm --filter @interview-agent/product-api test -- ai-invocation ai-usage`

Expected: tenant/user where 条件、未授权短路、90 天清理和日志故障降级均通过。

### Task 4: 在所有真实模型调用边界接入旁路记录

**Files:**

- Modify: `apps/product-api/src/modules/model-credential/model-credential.service.ts`
- Modify: `apps/product-api/src/modules/model-credential/model-credential.module.ts`
- Modify: `apps/product-api/src/modules/practice/practice-model-evaluator.ts`
- Modify: `apps/product-api/src/modules/practice/practice.module.ts`
- Modify: `apps/product-api/src/modules/agent-runtime/user-model-runtime.client.ts`
- Modify: `apps/product-api/src/modules/agent-runtime/agent-runtime.module.ts`
- Modify: related existing service specs

- [ ] **Step 1: 给连接测试、普通/流式练习评价、普通/流式面试下一步写调用一次且元数据正确的失败用例。**

```ts
expect(invocations.measure).toHaveBeenCalledWith(
  expect.objectContaining({ operation: 'practice_evaluation', credentialId: 'credential-1' }),
  expect.any(Function),
);
```

- [ ] **Step 2: 在拿到已验证默认凭据后、调用 provider 前包装 `measure()`；凭据缺失、输入校验或授权失败不创建伪调用日志。**

```ts
return this.invocations.measure(
  invocationMetadata(context, credential, 'interview_next', { sessionId: input.session.id }),
  (onUsage) => this.provider.complete({ ...credential, systemPrompt, userPrompt, onUsage }),
);
```

- [ ] **Step 3: 流式分支在流结束或上游 abort 后写入同一条终态日志，避免 `complete()` 与 `stream()` 双计。**

```ts
return this.invocations.measure(metadata, async (onUsage) => {
  for await (const delta of this.provider.stream({ ...request, onUsage })) consume(delta);
  return finalize();
});
```

- [ ] **Step 4: 导入 `AiUsageModule` 并导出所需服务，确保现有模块没有循环依赖。**

- [ ] **Step 5: 运行模型凭据、练习和 runtime 定向测试。**

Run: `pnpm --filter @interview-agent/product-api test -- model-credential practice-model-evaluator user-model-runtime`

Expected: 每条真实 provider 调用恰好一个日志，业务错误语义保持不变。

### Task 5: 提供平台管理员 AI 分析 API

**Files:**

- Create: `apps/product-api/src/modules/ai-usage/platform-ai-analytics.service.ts`
- Create: `apps/product-api/src/modules/ai-usage/platform-ai-analytics.service.spec.ts`
- Modify: `apps/product-api/src/modules/ai-usage/ai-usage.module.ts`
- Modify: `apps/product-api/src/modules/admin/admin.module.ts`
- Modify: `apps/product-api/src/modules/admin/admin.controller.ts`
- Modify: `apps/product-api/src/modules/admin/admin.controller.spec.ts`

- [ ] **Step 1: 为 provider/operation 过滤、无失败记录、失败码、逐日趋势、平台权限短路写失败用例。**

```ts
await expect(service.analytics(userContext, { period: '7d' })).rejects.toThrow('forbidden');
expect(prisma.aiInvocation.groupBy).toHaveBeenCalledWith(
  expect.objectContaining({ by: ['provider', 'model'] }),
);
```

- [ ] **Step 2: 使用 `analytics:read` 平台作用域做授权，聚合全站调用量、成功率、平均延迟、已返回 token、模型/提供商、业务操作、错误码和最近失败。**

```ts
@Roles('platform_admin')
@Get('platform/ai-analytics')
aiAnalytics(@Req() request: ProductRequest, @Query() query: unknown) {
  return this.services.aiAnalytics.analytics(request.context, PlatformAiAnalyticsQuerySchema.parse(query));
}
```

- [ ] **Step 3: 只在返回 DTO 中暴露脱敏的 `errorCode` 和已定义聚合字段，不透传 `AiInvocation` 原始行或关系对象。**

- [ ] **Step 4: 运行管理员控制器和平台分析服务定向测试。**

Run: `pnpm --filter @interview-agent/product-api test -- platform-ai-analytics admin.controller`

Expected: 非平台管理员在触碰数据前被拒绝，查询结果不含用户隐私和密钥字段。

### Task 6: 构建用户端“我的 AI 使用情况”

**Files:**

- Create: `apps/user-portal/src/lib/ai-usage-api.ts`
- Create: `apps/user-portal/src/lib/ai-usage-api.test.ts`
- Create: `apps/user-portal/src/components/settings/AiUsageSummary.tsx`
- Create: `apps/user-portal/src/components/settings/AiUsageSummary.test.tsx`
- Modify: `apps/user-portal/src/components/settings/SettingsPageContent.tsx`
- Modify: `apps/user-portal/src/app/styles/interview.css` (or the existing settings stylesheet used by the page)

- [ ] **Step 1: 为请求路径/schema、加载、空态、没有 usage、失败记录和 390px 紧凑布局写测试。**

```tsx
expect(screen.getByText('还没有 AI 调用记录')).toBeVisible();
expect(screen.getByText('供应商未提供 token 用量')).toBeVisible();
expect(screen.getByText('MODEL_PROVIDER_RATE_LIMITED')).toBeVisible();
```

- [ ] **Step 2: 通过 `apiRequest` 获取安全的 summary；只在模型设置 tab 激活时请求，卸载或切换时取消请求。**

```ts
export function getAiUsageSummary(period: AiUsagePeriod, signal?: AbortSignal) {
  return apiRequest({ path: `/ai-usage/summary?period=${period}`, schema: AiUsageSummarySchema, init: { signal } });
}
```

- [ ] **Step 3: 在模型连接列表下渲染克制的使用卡：调用数、成功率、平均耗时、返回 token、模型分布和最近记录。**

```tsx
<section className="settings-section ai-usage-summary" aria-labelledby="ai-usage-heading">
  <h2 id="ai-usage-heading">我的 AI 使用情况</h2>
  <p>只统计你的模型连接产生的调用；不会保存提示词或回答正文。</p>
</section>
```

- [ ] **Step 4: 遵循现有用户端主题变量：将重点放在一条低饱和的“用量脉冲”边线与状态颜色上，支持键盘焦点、`prefers-reduced-motion` 和窄屏单列。**

- [ ] **Step 5: 运行用户端定向测试和类型检查。**

Run: `pnpm --filter @interview-agent/user-portal test -- ai-usage SettingsPageContent && pnpm --filter @interview-agent/user-portal typecheck`

Expected: 空、加载、错误、token 缺失和记录态均有清晰且不误导的交互反馈。

### Task 7: 构建管理端“AI 调用洞察”

**Files:**

- Modify: `apps/admin-console/src/lib/platform-api.ts`
- Create: `apps/admin-console/src/lib/platform-ai-analytics-api.test.ts`
- Create: `apps/admin-console/src/components/dashboard/PlatformAiAnalytics.tsx`
- Create: `apps/admin-console/src/components/dashboard/PlatformAiAnalytics.test.tsx`
- Modify: `apps/admin-console/src/components/dashboard/PlatformAnalytics.tsx`
- Modify: `apps/admin-console/src/app/styles/antd-admin.css`

- [ ] **Step 1: 为 URL query、响应 schema、无记录、筛选、403、失败码和最近失败表格写测试。**

```tsx
expect(screen.getByRole('heading', { name: 'AI 调用洞察' })).toBeVisible();
expect(screen.getByText('当前筛选下没有真实模型调用')).toBeVisible();
expect(screen.queryByText('prompt')).not.toBeInTheDocument();
```

- [ ] **Step 2: 复用管理端请求适配器，以 period/provider/operation 构造 `/admin/platform/ai-analytics` 请求，并由 Zod 验证返回值。**

```ts
path: `/admin/platform/ai-analytics?${new URLSearchParams({ period, ...(provider && { provider }) })}`;
```

- [ ] **Step 3: 在现有数据看板中新增独立区块，而非修改 `AgentRun` 运行质量卡；先给出四项总览，再给 provider/model、业务操作、失败码和最近失败。**

```tsx
<PlatformAiAnalytics active={active} period={period} refreshKey={refreshKey} />
```

- [ ] **Step 4: 使用现有 Ant Design 密集卡与页面主题色，避免额外渐变和抢眼按钮；筛选控件在 390px 下换行并保证表格可横向滚动。**

- [ ] **Step 5: 运行管理端定向测试和类型检查。**

Run: `pnpm --filter @interview-agent/admin-console test -- PlatformAiAnalytics platform-ai-analytics-api && pnpm --filter @interview-agent/admin-console typecheck`

Expected: 管理端 AI 数据与既有运营/AgentRun 卡并列且职责清晰。

### Task 8: 迁移、质量门禁与浏览器验收

**Files:**

- Modify only as required by concrete test, type, lint or build findings from Tasks 1-7.

- [ ] **Step 1: 生成 Prisma client 并向已配置数据库部署迁移。**

Run: `pnpm --filter @interview-agent/product-api db:generate && pnpm --filter @interview-agent/product-api db:migrate:deploy`

Expected: client 与 migration 均成功；若环境未配置数据库，记录精确阻断原因，不跳过其余静态验证。

- [ ] **Step 2: 运行 contracts、API、用户端和管理端的本次定向测试、类型检查与 lint。**

Run: `pnpm --filter @interview-agent/contracts test && pnpm --filter @interview-agent/product-api test -- ai-invocation ai-usage model-provider practice-model-evaluator user-model-runtime platform-ai-analytics && pnpm --filter @interview-agent/product-api typecheck && pnpm --filter @interview-agent/product-api lint && pnpm --filter @interview-agent/user-portal test -- ai-usage && pnpm --filter @interview-agent/user-portal typecheck && pnpm --filter @interview-agent/user-portal lint && pnpm --filter @interview-agent/admin-console test -- PlatformAiAnalytics platform-ai-analytics-api && pnpm --filter @interview-agent/admin-console typecheck && pnpm --filter @interview-agent/admin-console lint`

- [ ] **Step 3: 运行两个前端构建、格式和本次路径 diff 检查。**

Run: `pnpm --filter @interview-agent/user-portal build && pnpm --filter @interview-agent/admin-console build && pnpm exec prettier --check packages/contracts/src/schemas/ai-usage.ts packages/contracts/src/index.ts apps/product-api/prisma/schema apps/product-api/src/modules/ai-usage apps/product-api/src/modules/model-credential apps/product-api/src/modules/practice/practice-model-evaluator.ts apps/product-api/src/modules/agent-runtime/user-model-runtime.client.ts apps/product-api/src/modules/admin apps/user-portal/src/lib/ai-usage-api.ts apps/user-portal/src/components/settings apps/admin-console/src/lib/platform-api.ts apps/admin-console/src/components/dashboard && git diff --check -- packages/contracts apps/product-api/prisma/schema apps/product-api/src/modules/ai-usage apps/product-api/src/modules/model-credential apps/product-api/src/modules/practice/practice-model-evaluator.ts apps/product-api/src/modules/agent-runtime/user-model-runtime.client.ts apps/product-api/src/modules/admin apps/user-portal/src/lib/ai-usage-api.ts apps/user-portal/src/components/settings apps/admin-console/src/lib/platform-api.ts apps/admin-console/src/components/dashboard`

- [ ] **Step 4: 进行浏览器 smoke：用户模型设置加载/空态/真实 recent 状态；平台管理员看板筛选/403 状态；390px 下无横向页面溢出。**

- [ ] **Step 5: 按设计逐项复核隐私边界、保留期、权限和三类调用点，记录任何环境或无关工作区问题。**

## Plan self-review

- **需求覆盖：** 任务 1 覆盖模型与契约；任务 2 覆盖 provider usage；任务 3 覆盖安全采集、90 天清理与用户 API；任务 4 覆盖连接测试、练习、面试三类真实调用；任务 5 覆盖平台 API；任务 6-7 覆盖用户端与管理端；任务 8 覆盖迁移、质量门禁和浏览器验收。
- **隐私与业务边界：** 每个响应仅使用 schemas 中的白名单字段；日志写入/清理降级明确写入任务 3；`AgentRun` 与 `AiInvocation` 的职责隔离在全局约束中明确。
- **占位符扫描：** 本计划没有未落实的占位标签、跨任务引用或泛化的错误处理描述；migration 的时间戳由 Prisma 生成命令决定，不属于实现占位。
- **类型一致性：** `AiUsagePeriod`、`AiInvocationOperation`、`AiInvocationStatus`、`ModelTokenUsage`、`AiUsageSummary` 与 `PlatformAiAnalytics` 在任务 1-7 中使用同一命名；三类操作名与设计文档一致。
