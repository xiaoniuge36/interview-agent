# 轻量 BI 数据看板实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有平台数据看板改造成基于 Ant Design Charts 的轻量 BI 仪表盘，提升趋势、运行质量、内容链路和风险信息的可读性。

**Architecture:** 保持现有 `PlatformDashboard` 数据契约不变。在 Admin Console 增加一个客户端图表适配层，用 `next/dynamic` 禁止 G2/Canvas 服务端渲染；图表配置从纯模型函数生成，页面组件只负责业务布局与状态。

**Tech Stack:** Next.js 15、React 18、Ant Design 6、`@ant-design/charts@^2.6.5`、Vitest。

## Global Constraints

- 不修改 Product API、Prisma、`PlatformDashboard` contracts 或统计口径。
- 图表库仅在浏览器端加载；服务端静态渲染与 Vitest 不执行 Canvas。
- 继续只显示 API 返回的真实数据，不添加环比、同比或模拟趋势。
- 保持平台管理员权限、全局错误提示、空状态和移动端布局。

---

### Task 1: 引入图表库并建立客户端图表适配层

**Files:**
- Modify: `apps/admin-console/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/admin-console/src/components/dashboard/platform-bi-model.ts`
- Create: `apps/admin-console/src/components/dashboard/PlatformBiCharts.tsx`
- Test: `apps/admin-console/src/components/dashboard/platform-bi-model.test.ts`

**Interfaces:**
- Consumes: `PlatformDashboard['trend']` 与 `PlatformDashboard['funnel']`。
- Produces: `toTrendChartData(trend, metric)`、`toFunnelChartData(funnel)`、`PlatformTrendArea`、`PlatformRuntimeGauge`、`PlatformFunnelBar`。

- [ ] **Step 1: 新增失败模型测试**

```ts
expect(toTrendChartData(points, 'agentRuns')).toEqual([
  { date: '07/16', value: 4, metric: 'Agent 调用' },
]);
expect(toFunnelChartData(funnel)[1]).toMatchObject({ stage: '待审核存量', value: 21, tone: 'warning' });
```

- [ ] **Step 2: 运行测试确认缺少模型**

Run: `pnpm exec vitest run src/components/dashboard/platform-bi-model.test.ts`

- [ ] **Step 3: 安装受控依赖**

Run: `pnpm --filter @interview-agent/admin-console add @ant-design/charts@^2.6.5`

- [ ] **Step 4: 实现模型与动态图表组件**

```tsx
const Area = dynamic(
  () => import('@ant-design/charts').then((module) => module.Area),
  { ssr: false, loading: () => <ChartLoading /> },
);
```

`PlatformTrendArea` 使用渐变面积图、Tooltip、平滑曲线与真实日期轴；`PlatformRuntimeGauge` 使用 0–100 的仪表盘；`PlatformFunnelBar` 使用横向条形图并保留 warning/critical 色。

- [ ] **Step 5: 运行模型测试**

Run: `pnpm exec vitest run src/components/dashboard/platform-bi-model.test.ts`

### Task 2: 重组轻量 BI 页面与视觉层次

**Files:**
- Modify: `apps/admin-console/src/components/dashboard/PlatformAnalytics.tsx`
- Modify: `apps/admin-console/src/components/dashboard/PlatformTrendChart.tsx`
- Modify: `apps/admin-console/src/components/dashboard/PlatformHealthSummary.tsx`
- Modify: `apps/admin-console/src/components/dashboard/PlatformFunnel.tsx`
- Modify: `apps/admin-console/src/app/styles/antd-admin.css`
- Modify: `apps/admin-console/src/components/dashboard/PlatformAnalytics.test.tsx`

**Interfaces:**
- Consumes: Task 1 的图表适配组件和现有 `PlatformDashboard`。
- Produces: 四区布局——运营概览、经营趋势、运行质量、内容与训练/风险。

- [ ] **Step 1: 将静态渲染断言调整为 BI 页面语义**

```tsx
expect(markup).toContain('运营概览');
expect(markup).toContain('经营趋势');
expect(markup).toContain('内容与训练链路');
expect(markup).toContain('近期运行风险');
```

- [ ] **Step 2: 运行定向测试确认旧页面不满足新语义**

Run: `pnpm exec vitest run src/components/dashboard/PlatformAnalytics.test.tsx`

- [ ] **Step 3: 实现页面布局**

删除大面积深蓝 hero；概览区显示健康状态与紧凑指标卡。趋势区使用 `PlatformTrendArea`；运行质量使用 `PlatformRuntimeGauge`；漏斗区使用 `PlatformFunnelBar`。空状态继续使用 Ant Design `Empty`，风险区只在 API 的 `recentFailures` 非空时显示表格。

- [ ] **Step 4: 完成响应式 CSS**

```css
.platform-bi-grid { display:grid; grid-template-columns:minmax(0,1.65fr) minmax(320px,1fr); gap:16px; }
@media (max-width: 992px) { .platform-bi-grid { grid-template-columns:1fr; } }
```

桌面端趋势比运行质量更宽；768px 以下单列；图表容器最小高度 280px；取消原 SVG 大圆点和暗色渐变横幅。

- [ ] **Step 5: 运行定向测试**

Run: `pnpm exec vitest run src/components/dashboard/PlatformAnalytics.test.tsx`

### Task 3: 质量验证与视觉验收

**Files:**
- Verify only: `apps/admin-console`

- [ ] **Step 1: 类型与质量检查**

Run: `pnpm --filter @interview-agent/admin-console typecheck && pnpm --filter @interview-agent/admin-console lint`

- [ ] **Step 2: 运行后台全量测试**

Run: `pnpm --filter @interview-agent/admin-console test`

- [ ] **Step 3: 浏览器验收**

流程：以平台管理员进入 `#analytics`，切换今日、近 7 天、近 30 天；确认 Area、Gauge、Bar 图表 Tooltip 显示真实数据，页面无框架错误和控制台错误；在 1440px 与 768px 检查布局。

- [ ] **Step 4: 差异检查**

Run: `git diff --check`
