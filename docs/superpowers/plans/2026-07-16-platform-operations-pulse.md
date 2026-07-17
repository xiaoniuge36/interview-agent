# 平台运营脉搏实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有治理控制台内提供真实的平台经营健康趋势、漏斗和风险视图，并提升账号治理的扫描效率与角色变更体验。

**Architecture:** 保持 `GET /admin/platform/dashboard` 为单一事实接口，contracts 定义趋势、漏斗和提醒，Product API 用现有 Prisma 数据按 UTC 天分桶。Admin Console 以零依赖 SVG 图表和 Ant Design 组件渲染数据；账号页从同一列表响应派生当前筛选结果摘要，不制造全局统计。

**Tech Stack:** NestJS、Prisma、Zod contracts、Next.js、React、Ant Design、Vitest、Jest、原生 SVG。

## Global Constraints

- 不新增系统、数据库表、迁移或前端依赖。
- 看板数据只能由平台管理员通过既有 `analytics:read` 平台权限读取。
- 统计窗口按 UTC，空日期须补零；存量与窗口新增必须在文案中区分。
- 表单和错误状态继续使用现有 Ant Design 与全局传统提示。

---

### Task 1: 扩展平台经营健康契约与后端聚合

**Files:**

- Modify: `packages/contracts/src/schemas/admin.ts`
- Modify: `apps/product-api/src/modules/admin/platform-dashboard.metrics.ts`
- Modify: `apps/product-api/src/modules/admin/platform-dashboard.service.spec.ts`
- Test: `packages/contracts/src/schemas/admin-query.test.ts`

**Interfaces:**

- Produces: `PlatformDashboard.trend`, `PlatformDashboard.funnel`, `PlatformDashboard.alerts`。
- Consumes: 既有 `PlatformDashboardPeriod`、Prisma 的 `user`、`question`、`practiceSession`、`practiceReport`、`agentRun`、`importTask`、`candidateQuestion`。

- [ ] **Step 1: 写入 contract 失败用例**

```ts
expect(
  PlatformDashboardSchema.safeParse({
    ...dashboard,
    trend: [
      {
        date: '2026-07-16',
        accountsCreated: 1,
        questionsPublished: 2,
        trainingCompleted: 3,
        agentRuns: 4,
      },
    ],
  }).success,
).toBe(true);
```

- [ ] **Step 2: 运行定向 contract 测试并确认失败**

Run: `pnpm --filter @interview-agent/contracts test -- admin-query.test.ts`

- [ ] **Step 3: 扩展 Zod 类型和 UTC 分桶聚合**

```ts
type PlatformTrendPoint = {
  date: string;
  accountsCreated: number;
  questionsPublished: number;
  trainingCompleted: number;
  agentRuns: number;
};
```

聚合函数必须生成窗口的所有 UTC 日期桶，查询各实体的 `createdAt`，并将各结果填入对应日期；`trainingCompleted` 为新增面试报告与练习报告之和。

- [ ] **Step 4: 添加健康漏斗和提醒断言**

```ts
expect(result).toMatchObject({
  funnel: {
    imports: 4,
    pendingCandidates: 3,
    publishedQuestions: 7,
    practiceSubmissions: 5,
    practiceReports: 3,
  },
  alerts: expect.arrayContaining([expect.objectContaining({ code: 'review_backlog', count: 3 })]),
});
```

- [ ] **Step 5: 运行定向 contract 与 API 测试**

Run: `pnpm --filter @interview-agent/contracts test && pnpm exec jest --runInBand src/modules/admin/platform-dashboard.service.spec.ts`

### Task 2: 建立运营看板可视化组件

**Files:**

- Create: `apps/admin-console/src/components/dashboard/platform-analytics-model.ts`
- Create: `apps/admin-console/src/components/dashboard/PlatformTrendChart.tsx`
- Create: `apps/admin-console/src/components/dashboard/PlatformHealthSummary.tsx`
- Create: `apps/admin-console/src/components/dashboard/PlatformFunnel.tsx`
- Modify: `apps/admin-console/src/components/dashboard/PlatformAnalytics.tsx`
- Modify: `apps/admin-console/src/components/dashboard/PlatformAnalytics.test.tsx`
- Modify: `apps/admin-console/src/app/styles/antd-admin.css`

**Interfaces:**

- Consumes: Task 1 的 `PlatformDashboard.trend`、`funnel`、`alerts`。
- Produces: 健康等级、折线图 SVG 路径、漏斗百分比和无障碍文本。

- [ ] **Step 1: 写入模型失败用例**

```ts
expect(platformHealth({ successRate: 98, schemaPassRate: 99, fallbacks: 0, runs: 12 })).toEqual({
  level: 'healthy',
  label: '运行健康',
});
expect(buildTrendGeometry([{ date: '2026-07-16', agentRuns: 0 }], 'agentRuns')).toHaveLength(1);
```

- [ ] **Step 2: 运行定向 Vitest 并确认失败**

Run: `pnpm exec vitest run src/components/dashboard/PlatformAnalytics.test.tsx`

- [ ] **Step 3: 实现纯模型与零依赖 SVG 图表**

`PlatformTrendChart` 使用单个 `<svg>` 的折线与可聚焦数据点；每个点有 `aria-label`，无数据时显示空状态，不插入伪造数值。

- [ ] **Step 4: 重组看板层级**

健康总览作为首屏锚点；趋势与运行质量双列；内容/训练漏斗和待处理提醒双列；近期失败表保留在风险区。`today`、`7d`、`30d` 继续驱动同一真实 API 查询。

- [ ] **Step 5: 添加响应式 CSS**

```css
.platform-pulse-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 16px;
}
@media (max-width: 992px) {
  .platform-pulse-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 6: 运行前端定向测试**

Run: `pnpm exec vitest run src/components/dashboard/PlatformAnalytics.test.tsx`

### Task 3: 重做账号治理的摘要、表格和角色变更交互

**Files:**

- Create: `apps/admin-console/src/components/dashboard/account-management-model.ts`
- Modify: `apps/admin-console/src/components/dashboard/AccountManagement.tsx`
- Modify: `apps/admin-console/src/components/dashboard/AccountToolbar.tsx`
- Modify: `apps/admin-console/src/components/dashboard/AccountTable.tsx`
- Modify: `apps/admin-console/src/components/dashboard/AccountManagement.test.tsx`
- Modify: `apps/admin-console/src/app/styles/antd-admin.css`

**Interfaces:**

- Consumes: 已加载的 `AccountView[]`。
- Produces: `summarizeAccounts(accounts)`，返回当前筛选结果的总量、活跃、禁用、后台账号数量。

- [ ] **Step 1: 写入账号摘要与角色弹窗失败用例**

```tsx
expect(summarizeAccounts(accounts)).toMatchObject({ total: 3, active: 2, disabled: 1 });
render(<RoleModal account={account} role="user" ... />);
expect(screen.getByRole('combobox')).toHaveStyle({ width: '100%' });
```

- [ ] **Step 2: 运行定向 Vitest 并确认失败**

Run: `pnpm exec vitest run src/components/dashboard/AccountManagement.test.tsx`

- [ ] **Step 3: 实现摘要与高级筛选**

账号页添加四个“当前结果”摘要；关键词常驻，其余筛选置于可展开区域，查询、重置、导出保持右对齐。

- [ ] **Step 4: 提升身份与操作列可读性**

身份块使用字母头像、名称、邮件/主体；角色、来源、状态显示规范标签。详情保持直达，角色调整和状态切换统一在更多操作菜单中，保留确认框。

- [ ] **Step 5: 修复角色变更弹窗**

`Select` 使用 `width: '100%'`，弹窗内显示当前账号身份；选项以“用户端用户 / 审核员 / 租户管理员 / 平台管理员 / 客服支持”的完整文本显示，并增加角色作用域说明。禁止依赖窄内容宽度自动缩放。

- [ ] **Step 6: 运行定向 Vitest**

Run: `pnpm exec vitest run src/components/dashboard/AccountManagement.test.tsx`

### Task 4: 跨包验证与浏览器验收

**Files:**

- Verify only: `packages/contracts`, `apps/product-api`, `apps/admin-console`

- [ ] **Step 1: 运行类型检查与 Lint**

Run: `pnpm --filter @interview-agent/contracts typecheck && pnpm --filter @interview-agent/admin-console typecheck && pnpm --filter @interview-agent/admin-console lint`

- [ ] **Step 2: 运行全部受影响测试**

Run: `pnpm --filter @interview-agent/contracts test && pnpm exec jest --runInBand src/modules/admin/platform-dashboard.service.spec.ts && pnpm --filter @interview-agent/admin-console test`

- [ ] **Step 3: 做桌面与移动端渲染验收**

流程：以平台管理员进入 `#analytics`，切换 `7d` 与 `30d`，确认趋势和风险列表更新；进入 `#accounts`，展开高级筛选、打开角色调整，确认下拉选项完整可读。

- [ ] **Step 4: 检查差异质量**

Run: `git diff --check`
