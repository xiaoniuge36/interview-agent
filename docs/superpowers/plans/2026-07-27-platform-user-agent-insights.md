# 平台用户与 Agent 使用洞察 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在既有平台数据看板中显示真实的用户参与与四类 Agent 使用指标。

**Architecture:** 扩展 `PlatformDashboardSchema`，由现有 dashboard 聚合并行读取普通用户登录和 `AiInvocation` operation/status 聚合。管理端新增一个展示组件，周期仍由父页面统一控制。

**Tech Stack:** TypeScript、Zod、NestJS/Prisma、React、Ant Design、Jest、Vitest。

---

### Task 1: 先定义会失败的共享契约与聚合测试

**Files:**

- Modify: `packages/contracts/src/schemas/admin-query.test.ts`
- Modify: `apps/product-api/src/modules/admin/platform-dashboard.service.spec.ts`

- [x] **Step 1: 要求 dashboard 返回用户和 Agent 洞察**

```ts
userUsage: { activeUsers: 2, interviews: 6, practiceSubmissions: 5, reports: 7 },
agentUsage: [
  { agent: 'interview', runs: 8, succeeded: 7, successRate: 87.5 },
  { agent: 'practice_evaluation', runs: 4, succeeded: 4, successRate: 100 },
  { agent: 'user_assistant', runs: 3, succeeded: 2, successRate: 66.7 },
  { agent: 'admin_assistant', runs: 2, succeeded: 2, successRate: 100 },
],
```

- [x] **Step 2: 运行测试并确认因字段尚未实现而失败**

Run: `pnpm --filter @interview-agent/contracts test && pnpm --filter @interview-agent/product-api test -- --runInBand src/modules/admin/platform-dashboard.service.spec.ts`

Expected: dashboard schema strips/rejects the new fields and Product API aggregation does not match `userUsage` or `agentUsage`。

### Task 2: 扩展真实 dashboard 聚合与契约

**Files:**

- Modify: `packages/contracts/src/schemas/admin.ts`
- Modify: `apps/product-api/src/modules/admin/platform-dashboard.metrics.ts`

- [x] **Step 1: 添加稳定的 dashboard 字段**

```ts
userUsage: z.object({
  activeUsers: z.number().int().nonnegative(),
  interviews: z.number().int().nonnegative(),
  practiceSubmissions: z.number().int().nonnegative(),
  reports: z.number().int().nonnegative(),
}),
agentUsage: z.array(PlatformAgentUsageSchema).length(4),
```

- [x] **Step 2: 按 `AiInvocation.operation` 和 `status` 聚合四类 Agent**

```ts
const rows = await prisma.aiInvocation.groupBy({
  by: ['operation', 'status'],
  where: { createdAt: rangeFilter(range), operation: { in: AGENT_OPERATIONS } },
  _count: { _all: true },
});
```

将行数据映射为固定顺序的四项，`successRate` 使用现有 `percentage(succeeded, runs)`。

- [x] **Step 3: 运行同一组测试确认变绿**

Run: `pnpm --filter @interview-agent/contracts test && pnpm --filter @interview-agent/product-api test -- --runInBand src/modules/admin/platform-dashboard.service.spec.ts`

Expected: 两个命令退出码均为 `0`。

### Task 3: 先定义会失败的洞察区界面测试

**Files:**

- Create: `apps/admin-console/src/components/dashboard/PlatformUsageInsights.test.tsx`
- Modify: `apps/admin-console/src/components/dashboard/PlatformAnalytics.test.tsx`

- [x] **Step 1: 断言用户和四个 Agent 均可见**

```ts
expect(markup).toContain('用户使用情况');
expect(markup).toContain('模拟面试 Agent');
expect(markup).toContain('练习评估 Agent');
expect(markup).toContain('用户助手 Agent');
expect(markup).toContain('管理员助手 Agent');
```

- [x] **Step 2: 运行测试并确认新组件缺失**

Run: `pnpm --filter @interview-agent/admin-console test -- --run src/components/dashboard/PlatformUsageInsights.test.tsx src/components/dashboard/PlatformAnalytics.test.tsx`

Expected: FAIL，原因是 `PlatformUsageInsights` 尚不存在或未被接入。

### Task 4: 渲染响应式用户与 Agent 洞察区

**Files:**

- Create: `apps/admin-console/src/components/dashboard/PlatformUsageInsights.tsx`
- Modify: `apps/admin-console/src/components/dashboard/PlatformAnalytics.tsx`
- Modify: `apps/admin-console/src/components/dashboard/PlatformAnalytics.test.tsx`
- Modify: `apps/admin-console/src/app/styles/antd-admin.css`

- [x] **Step 1: 用只读视图组件渲染契约指标**

```tsx
<Card title="用户使用情况">…四项用户指标…</Card>
<Card title="Agent 使用情况">…四个固定 Agent 条目…</Card>
```

Agent 条目显示 `runs`、`succeeded` 和 `successRate`，不显示 prompt、回答、错误摘要或 token 明细。

- [x] **Step 2: 将组件放入现有看板的次级双列区**

```tsx
<PlatformUsageInsights dashboard={dashboard} />
```

- [x] **Step 3: 添加桌面双列、平板单列和移动端两列统计样式**

```css
.platform-usage-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
@media (max-width: 1120px) {
  .platform-usage-grid {
    grid-template-columns: 1fr;
  }
}
```

- [x] **Step 4: 运行界面测试确认变绿**

Run: `pnpm --filter @interview-agent/admin-console test -- --run src/components/dashboard/PlatformUsageInsights.test.tsx src/components/dashboard/PlatformAnalytics.test.tsx`

Expected: 所有断言通过。

### Task 5: 最终验证

**Files:**

- Verify: `packages/contracts/src/schemas/admin.ts`
- Verify: `apps/product-api/src/modules/admin/platform-dashboard.metrics.ts`
- Verify: `apps/admin-console/src/components/dashboard/PlatformUsageInsights.tsx`

- [x] **Step 1: 运行所有直接相关验证**

Run: `pnpm --filter @interview-agent/contracts test && pnpm --filter @interview-agent/product-api test -- --runInBand src/modules/admin/platform-dashboard.service.spec.ts && pnpm --filter @interview-agent/admin-console test -- --run src/components/dashboard/PlatformUsageInsights.test.tsx src/components/dashboard/PlatformAnalytics.test.tsx && pnpm --filter @interview-agent/admin-console build && git diff --check -- packages/contracts/src/schemas/admin.ts apps/product-api/src/modules/admin/platform-dashboard.metrics.ts apps/product-api/src/modules/admin/platform-dashboard.service.spec.ts apps/admin-console/src/components/dashboard/PlatformUsageInsights.tsx apps/admin-console/src/components/dashboard/PlatformUsageInsights.test.tsx apps/admin-console/src/components/dashboard/PlatformAnalytics.tsx apps/admin-console/src/components/dashboard/PlatformAnalytics.test.tsx apps/admin-console/src/app/styles/antd-admin.css`

Expected: 全部命令退出码为 `0`，diff 检查无空白错误。
