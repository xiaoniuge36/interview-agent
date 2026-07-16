# 管理后台服务端查询与导出 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为管理后台六个列表提供真实服务端筛选、分页和 CSV 导出，并统一为“筛选项 + 查询 / 重置 / 导出”界面。

**Architecture:** 保留旧数组路由，新增 `/query` 与 `/export` 兼容端点。共享契约定义查询参数与分页响应；Product API 复用同一租户范围和 Prisma `where` 构造器查询或导出；前端以每个资源独立的已提交查询状态请求新端点。

**Tech Stack:** Next.js、React、Ant Design、NestJS、Prisma、Zod、Vitest/Jest、pnpm。

---

### Task 1: 定义共享查询与分页契约

**Files:**

- Modify: `packages/contracts/src/schemas/admin.ts`
- Modify: `packages/contracts/src/schemas/training.ts`
- Modify: `packages/contracts/src/index.ts`
- Create: `packages/contracts/src/schemas/admin-query.test.ts`

- [ ] 先为分页边界、资源筛选和候选题 `importTaskId` 写失败测试。
- [ ] 新增 `AdminPageSchema(itemSchema)`、六个 `*ListQuerySchema` 与其 TypeScript 类型；页面大小默认 20、最大 100，导出不使用页面大小。
- [ ] 为 `CandidateReviewSchema` 加入 `importTaskId: string | null`，使导入任务可精准进入审核队列。
- [ ] 运行 `pnpm --filter @interview-agent/contracts test` 和 `typecheck`，确认旧数组契约仍可解析。

### Task 2: 实现服务端查询、分页与安全 CSV 导出

**Files:**

- Create: `apps/product-api/src/modules/admin/admin-query.ts`
- Create: `apps/product-api/src/modules/admin/admin-csv.ts`
- Modify: `apps/product-api/src/modules/admin/admin.service.ts`
- Modify: `apps/product-api/src/modules/import/import.service.ts`
- Test: `apps/product-api/src/modules/admin/admin.service.spec.ts`
- Test: `apps/product-api/src/modules/import/import.service.spec.ts`

- [ ] 为每种资源写测试，断言 Prisma `where` 同时包含 tenant、权限范围、筛选条件与稳定排序，且查询使用 `count + skip + take`。
- [ ] 在共享查询模块中将 `keyword`、状态、难度、结果和 `importTaskId` 转成 Prisma 条件，避免 Controller 拼接查询。
- [ ] 实现每个资源的分页查询；导出复用同一筛选条件，但最多取 10,000 行。
- [ ] 实现 CSV 编码：UTF-8 BOM、双引号/换行转义、以 `= + - @` 开头的单元格前置单引号。
- [ ] 导出动作调用既有 `AuditService.record`，并保持相应资源的角色限制。
- [ ] 运行 `pnpm --filter @interview-agent/product-api test -- admin.service.spec.ts import.service.spec.ts` 与 `typecheck`。

### Task 3: 暴露兼容的 Query 与 Export 路由

**Files:**

- Modify: `apps/product-api/src/modules/admin/admin.controller.ts`
- Modify: `apps/product-api/src/modules/import/import.controller.ts`
- Test: `apps/product-api/src/modules/admin/admin.controller.spec.ts`
- Test: `apps/product-api/src/modules/import/import.controller.spec.ts`

- [ ] 在现有数组接口旁新增六个 `/query` 和 `/export` 路由；候选题静态路由必须在 `candidates/:id` 前注册。
- [ ] 用 Zod 解析 `@Query()`，导出通过 Express response 写入 `Content-Type`、安全 `Content-Disposition` 和 CSV body。
- [ ] 保持旧 `GET /admin/*` 数组响应不变，确认现有客户端不会被破坏。
- [ ] 覆盖查询参数传递、角色限制、响应头和旧路由兼容性。

### Task 4: 建立前端服务端列表数据层

**Files:**

- Modify: `apps/admin-console/src/lib/api.ts`
- Create: `apps/admin-console/src/lib/admin-list-api.ts`
- Create: `apps/admin-console/src/lib/admin-list-api.test.ts`
- Create: `apps/admin-console/src/hooks/useAdminPagedList.ts`
- Create: `apps/admin-console/src/hooks/useAdminPagedList.test.ts`
- Modify: `apps/admin-console/src/hooks/useAdminDashboard.ts`

- [ ] 为查询串编码、认证 CSV 下载和翻页条件保持写失败测试。
- [ ] 新增 `adminDownload`，以认证 headers 获取 blob，不复用 JSON 解析函数；下载文件名来自响应头的安全回退值。
- [ ] 为六种资源建立 `query` / `export` 请求适配器，统一解析 `AdminPageSchema`。
- [ ] 抽取受控分页 hook：草稿条件、已提交条件、页面变更、刷新和错误状态彼此独立。
- [ ] 将全局 dashboard hook 收敛为总览指标请求，避免它继续预取固定上限的六份数组。
- [ ] 运行 admin-console 定向测试、lint 和 typecheck。

### Task 5: 改造六个列表为 B 端查询工具栏

**Files:**

- Modify: `apps/admin-console/src/components/dashboard/AdminTableControls.tsx`
- Modify: `apps/admin-console/src/components/dashboard/ImportCenter.tsx`
- Modify: `apps/admin-console/src/components/dashboard/CandidateReviewQueue.tsx`
- Modify: `apps/admin-console/src/components/dashboard/QuestionAssetsTable.tsx`
- Modify: `apps/admin-console/src/components/dashboard/ModelGovernance.tsx`
- Modify: `apps/admin-console/src/components/dashboard/RuntimeObservability.tsx`
- Modify: `apps/admin-console/src/components/dashboard/AuditLogPanel.tsx`
- Modify: `apps/admin-console/src/app/styles/antd-admin.css`

- [ ] 以 AntD `Form`/`Space` 实现左侧筛选项、右侧“查询 / 重置 / 导出”；按 Enter 等价于查询。
- [ ] 将六个本地 `useMemo(filter*)` 和 `paginateRecords` 路径替换为 `useAdminPagedList`；`Table` 保持 `pagination={false}`，仅使用服务端返回 total 的 `AdminPagination`。
- [ ] 导出始终使用已提交条件，加载中禁用重复请求并展示失败提示。
- [ ] 保留现有表格列、详情抽屉、权限/失败状态和 Hash 页面持久化。
- [ ] 在窄屏下让筛选栏自动换行，操作按钮保持可见。

### Task 6: 让导入任务精确定位候选题审核队列

**Files:**

- Modify: `apps/admin-console/src/components/admin-navigation.ts`
- Modify: `apps/admin-console/src/components/dashboard/AdminDashboard.tsx`
- Modify: `apps/admin-console/src/components/dashboard/TrainingContentWorkbench.tsx`
- Modify: `apps/admin-console/src/components/dashboard/ImportCenter.tsx`
- Test: `apps/admin-console/src/components/admin-navigation.test.ts`

- [ ] 为 `#content?importTaskId=<id>` 编写解析和序列化测试，同时保留旧 Hash。
- [ ] 导入任务“去审核”写入带任务 ID 的 Hash；审核队列初始条件使用该 ID，并允许用户重置到全量队列。
- [ ] 验证选择候选题、抽屉和各页条件在 Hash 切换后仍保持预期行为。

### Task 7: 集成验证与浏览器验收

**Files:**

- Test: `apps/admin-console/src/**/*.test.ts`
- Test: `apps/product-api/src/modules/admin/**/*.spec.ts`

- [ ] 运行 contracts、Product API 和 admin-console 的相关测试、lint、typecheck、build 与 `git diff --check`。
- [ ] 使用真实本地管理员会话验证：筛选字段不自动请求；点击查询发送对应参数；翻页保留条件；导出下载 CSV；导入任务“去审核”只展示该任务候选题。
- [ ] 在桌面与移动视口检查筛选栏、表格横向滚动和下载错误反馈。
- [ ] 共享脏工作树中不 stage、commit、push 或重置无关改动。
