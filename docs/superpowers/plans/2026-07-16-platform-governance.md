# 平台级账号治理与数据看板 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 Ant Design 管理后台中安全接入跨租户账号治理与真实全站数据看板。

**Architecture:** 复用既有 `AdminModule`、hash 导航、API 客户端和列表组件。新增 `platform_admin` 作为唯一的平台边界，认证请求始终回查数据库账号状态；平台端点用独立 service 处理全站数据，既有租户 admin 工作流不变。

**Tech Stack:** NestJS 11、Prisma 6 / PostgreSQL、Zod contracts、Next.js 15、React 18、Ant Design 6、Jest、Vitest。

## Global Constraints

- 不新增系统、应用、域名、独立认证入口或图表依赖；仅扩展 `apps/admin-console` 与既有 Product API 的 `AdminModule`。
- `platform_admin` 才能读取或写入跨租户账号与全站看板；现有 `admin` 继续保持租户边界。
- 禁用必须在下一次受保护 API 请求和下一次本地登录时生效；不得在响应、日志或审计 metadata 中暴露密码或密码哈希。
- 不允许禁用自己、把自己降级、或禁用/降级最后一个 `platform_admin`。
- 遵循现有传统 Ant Design 交互：筛选项、查询/重置/导出、表格分页、Drawer、确认弹窗、全局 message。
- 不修改或暂存当前工作区中与本功能无关的用户改动。

---

## 文件结构

| 路径                                                                                                  | 责任                                    |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `apps/product-api/prisma/schema/{enums,identity}.prisma`                                              | 新角色、账号状态与查询索引。            |
| `apps/product-api/prisma/schema/migrations/20260716100000_platform_account_governance/migration.sql`  | 可部署的数据迁移与 bootstrap 角色升级。 |
| `packages/contracts/src/schemas/{context,admin}.ts`                                                   | 平台权限、看板、账号 DTO 和输入校验。   |
| `apps/product-api/src/common/{context,authn,authz}`                                                   | 数据库角色真相、禁用检查、策略范围。    |
| `apps/product-api/src/modules/admin/platform-dashboard.service.ts`                                    | 全站指标聚合。                          |
| `apps/product-api/src/modules/admin/account-governance.service.ts`                                    | 账号查询、变更、事务保护和审计。        |
| `apps/product-api/src/modules/admin/{admin.controller,admin-export-csv}.ts`                           | 受保护的 HTTP 端点和账号 CSV。          |
| `apps/admin-console/src/components/dashboard/{PlatformAnalytics,AccountManagement,AccountDrawer}.tsx` | 两个新管理视图与账号操作。              |
| `apps/admin-console/src/lib/{platform-api,account-api}.ts`                                            | 真实 API 请求、导出与输入传输。         |
| `apps/admin-console/src/components/admin-navigation.ts`                                               | 新视图、菜单分组和深链。                |

## Task 1: 建立账号状态与平台角色的持久化基础

**Files:**

- Modify: `apps/product-api/prisma/schema/enums.prisma`
- Modify: `apps/product-api/prisma/schema/identity.prisma`
- Create: `apps/product-api/prisma/schema/migrations/20260716100000_platform_account_governance/migration.sql`
- Modify: `apps/product-api/prisma/bootstrap-admin.ts`
- Test: `apps/product-api/src/common/authn/local-auth.service.spec.ts`

**Interfaces:**

- Produces: Prisma `ActorRole.platform_admin`、`AccountStatus.active|disabled`，以及 `User.status`、`disabledAt`、`disabledByUserId`、`lastSignedInAt`。

- [ ] **Step 1: 写入迁移前的 schema 失败断言**

在现有 LocalAuth 测试新增“被禁用本地账号无法登录”的用例，模拟 `user.findUnique` 返回 `status: 'disabled'`，断言 `signIn` 以稳定业务错误拒绝。先运行：

```powershell
pnpm --filter @interview-agent/product-api test -- local-auth.service.spec.ts
```

预期：失败，因为当前查询没有读取状态且服务没有禁用分支。

- [ ] **Step 2: 扩展 Prisma schema 和生成迁移**

在 `ActorRole` 中加入 `platform_admin`，在 enum 文件定义：

```prisma
enum AccountStatus {
  active
  disabled
}
```

在 `User` 中加入：

```prisma
status            AccountStatus @default(active)
disabledAt        DateTime?
disabledByUserId  String?
lastSignedInAt    DateTime?

@@index([status, createdAt])
@@index([lastSignedInAt])
```

使用 `pnpm db:migrate -- --name platform_account_governance` 生成迁移；保留生成的 `ALTER TYPE`、新增列默认值和索引，不手写破坏性数据更新。然后执行 `pnpm db:validate && pnpm db:generate`。

- [ ] **Step 3: 升级 bootstrap 本地管理员**

将 `bootstrap-admin.ts` 的 create/update 角色都改为 `platform_admin`，使已有 `system/local:admin` 在下一次 bootstrap 自动升级。保留既有环境变量和密码哈希流程。

- [ ] **Step 4: 完成并通过定向测试**

为 LocalAuth mock 增加 `status`，并在服务查询中选取它。运行：

```powershell
pnpm --filter @interview-agent/product-api test -- local-auth.service.spec.ts
pnpm db:validate
```

预期：两个命令退出码均为 0。

## Task 2: 把平台权限、数据库身份真相和禁用拦截接入认证链

**Files:**

- Modify: `packages/contracts/src/schemas/context.ts`
- Modify: `packages/contracts/src/schemas/admin.ts`
- Test: `packages/contracts/src/schemas/admin-query.test.ts`
- Modify: `apps/product-api/src/common/context/request-context.ts`
- Modify: `apps/product-api/src/common/authn/auth-identity.service.ts`
- Modify: `apps/product-api/src/common/authn/identity-provisioner.ts`
- Test: `apps/product-api/src/common/authn/identity-provisioner.spec.ts`
- Modify: `apps/product-api/src/common/authn/local-auth.service.ts`
- Modify: `apps/product-api/src/common/authz/policy.service.ts`
- Test: `apps/product-api/src/common/authz/policy.service.spec.ts`

**Interfaces:**

- Consumes: Task 1 的 `User.status` 与 `ActorRole.platform_admin`。
- Produces: `Role = 'platform_admin'`，`Action = 'analytics:read' | 'account:read' | 'account:write'`，且认证成功返回数据库中已治理的 role。

- [ ] **Step 1: 先为 contracts 和 policy 写失败测试**

扩展 contracts 测试以解析 `platform_admin` 和三项 action；在 Policy 测试加入以下约束：

```ts
expect(policy.can(platformActor, 'account:read', { tenantId: OTHER_TENANT_ID })).toBe(true);
expect(policy.can(platformActor, 'question:read', { tenantId: OTHER_TENANT_ID })).toBe(false);
```

第一个 resource 通过显式 `platform: true` 标志或专用 `ResourceRef` 分支实现；第二个确保不意外扩大现有业务资源权限。

- [ ] **Step 2: 扩展 role、scope 与数据库 Actor 构造**

把 `platform_admin` 和新 actions 加入 `context.ts`；在 `roleScopes` 为 `platform_admin` 显式列出既有后台 scopes 与：

```ts
'analytics:read',
'account:read',
'account:write',
```

为 `ResourceRef` 加 `platform?: boolean`，在 `PolicyService.can` 中仅允许 `actor.role === 'platform_admin' && resource.platform === true` 跨租户；仍先检查 action scope。

- [ ] **Step 3: 让身份 provisioner 以数据库 role 为准并检查状态**

将已存在用户的 select 扩展为 `status`。`resolve` 应：

1. 如果用户状态为 `disabled`，抛出 `{ code: 'ACCOUNT_DISABLED', message: '该账号已被停用。' }` 的认证异常。
2. 已存在用户只合并 `email`、`name` 和 `lastSignedInAt: new Date()`，不再使用 token role 覆盖持久化 role。
3. 新用户仍使用初始 token role 创建，并设置 `lastSignedInAt`。

测试应覆盖“OIDC claim 从 user 变 admin 不覆盖已存的 user role”、“disabled 用户在 `resolve` 时被拒绝”和“成功 resolve 更新 `lastSignedInAt`”。

- [ ] **Step 4: 让本地登录在签 token 前检查状态并更新登录时间**

`LocalAuthService.signIn` 的 user select 增加 `status`；成功密码验证后先拒绝 disabled，再通过单次 `user.update` 写 `lastSignedInAt`，将更新后的 role/name/email 交给 `createSession`。返回、异常和 token 均不含 status 或凭据数据。

- [ ] **Step 5: 验证认证与权限回归**

运行：

```powershell
pnpm --filter @interview-agent/contracts test
pnpm --filter @interview-agent/product-api test -- policy.service.spec.ts identity-provisioner.spec.ts local-auth.service.spec.ts
pnpm contracts:check
```

预期：所有命令退出码为 0，且 `pnpm contracts:check` 无生成差异。

## Task 3: 实现真实全站数据看板 API

**Files:**

- Modify: `packages/contracts/src/schemas/admin.ts`
- Create: `apps/product-api/src/modules/admin/platform-dashboard.service.ts`
- Create: `apps/product-api/src/modules/admin/platform-dashboard.service.spec.ts`
- Modify: `apps/product-api/src/modules/admin/admin.controller.ts`
- Modify: `apps/product-api/src/modules/admin/admin.module.ts`
- Test: `apps/product-api/src/modules/admin/admin.controller.spec.ts`

**Interfaces:**

- Consumes: `analytics:read` 与 `{ platform: true }`。
- Produces: `GET /admin/platform/dashboard?period=today|7d|30d` 和 `PlatformDashboardSchema`。

- [ ] **Step 1: 定义看板 contracts 和失败测试**

在 `admin.ts` 定义：

```ts
export const PlatformDashboardPeriodSchema = z.enum(['today', '7d', '30d']).default('7d');
export const PlatformDashboardQuerySchema = z.object({ period: PlatformDashboardPeriodSchema });
export const PlatformDashboardSchema = z.object({
  period: PlatformDashboardPeriodSchema,
  range: z.object({ startAt: z.string().datetime(), endAt: z.string().datetime() }),
  accounts: z.object({
    total: z.number().int().nonnegative(),
    created: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
    disabled: z.number().int().nonnegative(),
    tenants: z.number().int().nonnegative(),
    admin: z.number().int().nonnegative(),
    users: z.number().int().nonnegative(),
  }),
  content: z.object({
    imports: z.number().int().nonnegative(),
    pendingCandidates: z.number().int().nonnegative(),
    publishedQuestions: z.number().int().nonnegative(),
    failedImports: z.number().int().nonnegative(),
  }),
  training: z.object({
    interviews: z.number().int().nonnegative(),
    reports: z.number().int().nonnegative(),
    practiceSubmissions: z.number().int().nonnegative(),
    practiceReports: z.number().int().nonnegative(),
  }),
  runtime: z.object({
    runs: z.number().int().nonnegative(),
    successRate: z.number().min(0).max(100),
    schemaPassRate: z.number().min(0).max(100),
    averageLatencyMs: z.number().nonnegative(),
    fallbacks: z.number().int().nonnegative(),
    recentFailures: z.array(AgentRunViewSchema),
  }),
});
```

测试默认期为 7d，非法 period 被拒绝，所有百分比范围合法。

- [ ] **Step 2: 写最小可验证聚合 service**

建立 `platform-dashboard.service.ts`，以 `periodStart(period, now)` 统一计算 UTC 起点，并并行执行 Prisma count / aggregate。写入明确的 where：窗口指标使用 `{ createdAt: { gte: startAt, lt: endAt } }`，累计账号/租户/已禁用使用全表 count；Agent 成功率分母为窗口内非 running run，schema 通过率分母为 `schemaValid != null`。

在调用 Prisma 前执行：

```ts
this.policy.assert(context.actor, 'analytics:read', { platform: true });
```

返回值必须经 `PlatformDashboardSchema.parse`，`recentFailures` 只返回失败和降级运行的安全视图字段。

- [ ] **Step 3: 将端点限定为 platform_admin**

在 `AdminController` 增加：

```ts
@Roles('platform_admin')
@Get('platform/dashboard')
platformDashboard(@Req() request: ProductRequest, @Query() query: unknown) {
  return this.platformDashboard.dashboard(request.context, PlatformDashboardQuerySchema.parse(query));
}
```

Controller 测试应证明 `'7d'` 被解析，并确保该方法委托 service；RolesGuard 测试添加 platform role 能命中该 route。

- [ ] **Step 4: 跑 API 定向验证**

```powershell
pnpm --filter @interview-agent/product-api test -- platform-dashboard.service.spec.ts admin.controller.spec.ts roles.guard.spec.ts
pnpm --filter @interview-agent/contracts test
```

预期：聚合、权限拒绝、DTO 解析和路由解析全通过。

## Task 4: 实现跨租户账号目录、写操作和审计 API

**Files:**

- Modify: `packages/contracts/src/schemas/admin.ts`
- Modify: `apps/product-api/src/modules/admin/admin-export-csv.ts`
- Test: `apps/product-api/src/modules/admin/admin-export-csv.spec.ts`
- Create: `apps/product-api/src/modules/admin/account-governance.service.ts`
- Create: `apps/product-api/src/modules/admin/account-governance.service.spec.ts`
- Modify: `apps/product-api/src/modules/admin/admin.controller.ts`
- Test: `apps/product-api/src/modules/admin/admin.controller.spec.ts`

**Interfaces:**

- Consumes: `account:read` / `account:write` 与 `AuditService.record`。
- Produces: paged `AccountView`、`AccountDetail`、账号 CSV 和三个 PATCH 操作。

- [ ] **Step 1: 先定义可验证输入/输出 contracts**

定义 `AccountStatusSchema`、`ManagedAccountRoleSchema`（排除 `agent_runtime`）、`AccountKindSchema`、`AccountAuthSourceSchema` 和列表 query：关键词、kind、role、status、authSource、tenantKeyword、createdFrom、createdTo 加上通用分页。`AccountView` 含安全字段：`id`、`name`、`email`、`subject`、`role`、`status`、`kind`、`authSource`、`tenant`、`lastSignedInAt`、`createdAt`；详情补 `disabledAt` 与账号治理审计视图。

写 input：

```ts
export const UpdateAccountRoleInputSchema = z.object({ role: ManagedAccountRoleSchema });
export const UpdateAccountStatusInputSchema = z.object({ status: AccountStatusSchema });
export const ResetLocalPasswordInputSchema = z.object({ password: LocalPasswordSchema });
```

在 contracts tests 覆盖边界、trim、日期、`agent_runtime` 拒绝和密码最小规则。

- [ ] **Step 2: 用失败测试锁定查询与导出条件**

`account-governance.service.spec.ts` 需覆盖：平台 actor 可查询两个 tenant、普通 admin 在 Prisma 前被拒绝、关键词同时命中 name/email/subject/tenant name、分页排序为 `createdAt desc, id desc`、local credential 映射为 `local`、无 credential 映射为 `oidc`、导出 take=10,000 并产生 `account:exported` 审计。

- [ ] **Step 3: 实现目录、详情和 CSV**

service 的查询仅排除 `agent_runtime`：

```ts
where: { role: { not: 'agent_runtime' }, ...filters }
```

同时 `include` tenant、credential 的存在性和最近 20 条 `AuditLog`（`resourceType: 'User', resourceId: accountId`）。映射层不得传播 `passwordHash`。在 `admin-export-csv.ts` 增加 `renderAccountExportCsv`，列为账号 ID、姓名、邮箱、角色、状态、认证来源、租户、最近登录、创建时间。

- [ ] **Step 4: 写保护性变更的事务测试与实现**

为 role/status 操作使用 `runSerializable`。在事务内读取 target，先执行：

```ts
if (target.id === context.actor.id && requestedRole !== 'platform_admin')
  throw selfMutationForbidden();
if (target.id === context.actor.id && requestedStatus === 'disabled') throw selfMutationForbidden();
if (removesLastPlatformAdmin(target, requestedChange, remainingPlatformAdminCount))
  throw lastPlatformAdminProtected();
```

然后 update `User`，状态变更同步写入 `disabledAt` / `disabledByUserId`，最后以同一事务 client 调 `audit.record`。密码重置先确认 local credential，使用 `hashPassword` 后 update credential，再记录 `account:password_reset`，审计 metadata 不携带 password。

测试必须断言：自我禁用/降级拒绝、最后管理员拒绝、OIDC 重置拒绝、本地重置 hash 不含明文、审计字段只包含前后角色/状态。

- [ ] **Step 5: 暴露 API 且维持双层守卫**

在现有 `AdminController` 注入 service，新增 `@Roles('platform_admin')` 的 query、export、detail、role、status、local-password 路由。每个 handler 解析对应 Zod input；export 通过既有 `sendCsv` 返回 `accounts.csv`。

- [ ] **Step 6: 验证账号 API**

```powershell
pnpm --filter @interview-agent/contracts test
pnpm --filter @interview-agent/product-api test -- account-governance.service.spec.ts admin.controller.spec.ts admin-export-csv.spec.ts
pnpm --filter @interview-agent/product-api typecheck
```

预期：权限、事务保护、CSV、密码安全和 API 参数均通过。

## Task 5: 在既有后台接入平台导航与真实数据看板

**Files:**

- Modify: `apps/admin-console/src/components/admin-navigation.ts`
- Test: `apps/admin-console/src/components/admin-navigation.test.ts`
- Modify: `apps/admin-console/src/components/admin-shell/AdminSidebar.tsx`
- Create: `apps/admin-console/src/lib/platform-api.ts`
- Create: `apps/admin-console/src/lib/platform-api.test.ts`
- Create: `apps/admin-console/src/components/dashboard/PlatformAnalytics.tsx`
- Create: `apps/admin-console/src/components/dashboard/PlatformAnalytics.test.tsx`
- Modify: `apps/admin-console/src/components/dashboard/AdminDashboard.tsx`

**Interfaces:**

- Consumes: `PlatformDashboardSchema` 与当前 `adminRequest`。
- Produces: `#analytics` hash 视图，`getPlatformDashboard(period, signal)` 和传统真实数据看板。

- [ ] **Step 1: 写导航失败测试并加入视图**

在 `ADMIN_VIEW_IDS` 加入 `analytics`、`accounts`。将数据看板和治理总览放在“运营总览”分组，将账号管理放在新的“平台治理”分组。更新 `ConsoleIconName` 与 `AdminSidebar.navigationIcon` 映射；测试所有 view 都能 round-trip hash、菜单每项只出现一次。

- [ ] **Step 2: 建立契约化看板请求**

`platform-api.ts` 仅导出：

```ts
export function getPlatformDashboard(period: PlatformDashboardPeriod, signal?: AbortSignal) {
  return adminRequest({
    path: `/admin/platform/dashboard?period=${period}`,
    schema: PlatformDashboardSchema,
    init: signal ? { signal } : undefined,
  });
}
```

测试 7d URL、Bearer header、响应 schema、401/403 统一 `AdminApiError` 行为。

- [ ] **Step 3: 实现传统看板 UI**

`PlatformAnalytics` 使用 `Segmented` 提供 `today|7d|30d`。请求中显示既有居中 `SectionFeedback`，数据成功后分为账号概况、内容漏斗、训练业务和 Agent 健康四组 `Card` / `Statistic`；仅真实 response 字段计算百分比。最近失败运行用紧凑 `Table` 展示 stage、status、latency、updatedAt；空数据使用 `Empty`。

- [ ] **Step 4: 集成到既有 Dashboard 生命周期**

在 `AdminDashboard` 渲染 analytics `DashboardView`，传入 `active` 和 `refreshKey`。顶部刷新在 analytics 活跃时重新请求；禁止在其他视图预加载跨租户看板。403 用 `SectionFeedback` 的无权限状态，保持全局错误/401 回登录现状。

- [ ] **Step 5: 验证管理端看板**

```powershell
pnpm --filter @interview-agent/admin-console test -- admin-navigation.test.ts PlatformAnalytics.test.tsx platform-api.test.ts
pnpm --filter @interview-agent/admin-console typecheck
```

预期：菜单、周期切换、成功/错误/空状态与真实请求均通过。

## Task 6: 在既有后台接入账号管理表格、Drawer 和治理动作

**Files:**

- Create: `apps/admin-console/src/lib/account-api.ts`
- Create: `apps/admin-console/src/lib/account-api.test.ts`
- Create: `apps/admin-console/src/components/dashboard/AccountManagement.tsx`
- Create: `apps/admin-console/src/components/dashboard/AccountDrawer.tsx`
- Create: `apps/admin-console/src/components/dashboard/AccountManagement.test.tsx`
- Modify: `apps/admin-console/src/components/dashboard/AdminDashboard.tsx`
- Modify: `apps/admin-console/src/app/styles/management-tables.css`

**Interfaces:**

- Consumes: `AccountViewSchema`、`AccountDetailSchema`、三个 PATCH input schema 与 existing `adminRequest` / `adminDownload`。
- Produces: `#accounts` 的主动查询、分页、导出、详情、角色/状态/本地密码操作。

- [ ] **Step 1: 定义账号 API client 和请求测试**

`account-api.ts` 导出 `queryAccounts`、`exportAccounts`、`getAccountDetail`、`updateAccountRole`、`updateAccountStatus`、`resetLocalPassword`。所有写请求使用：

```ts
init: { method: 'PATCH', body: JSON.stringify(input) }
```

客户端测试断言筛选 query 被 schema trim/序列化、写操作发送 JSON body、导出沿用安全文件名、API errors 被全局反馈订阅。

- [ ] **Step 2: 先写账号表格交互失败测试**

通过 mock API 覆盖：仅在用户点击“查询”后按 draft 筛选请求；分页继续使用 submitted query；导出使用 submitted query 不含分页；本地账号显示“重置密码”；OIDC 账号不显示此操作；点击“停用”弹出二次确认而非直接请求。

- [ ] **Step 3: 实现筛选、表格与分页**

`AccountManagement` 用 `Form` 和现有 `AdminTableToolbar` 模式显示关键词、账号类型、角色、状态、来源、租户、创建时间。右侧固定“查询 / 重置 / 导出”。列表列固定为账号、类型、角色、状态、认证来源、所属租户、最近登录、创建时间、操作；桌面滚动宽度不低于 1,200px，移动端保留横向表格而不挤压字段。

- [ ] **Step 4: 实现详情与写操作**

`AccountDrawer` 负责加载详情并显示描述列表、最近治理日志和单独密码表单。外层使用 `Modal.confirm` 执行角色和状态变更。成功后 `message.success`、关闭确认态、刷新 table/detail，并递增 Dashboard `refreshKey` 使数据看板失效重取。失败只依赖统一错误提示；密码输入以 `Input.Password` 控制，提交后立即清空组件 state。

- [ ] **Step 5: 集成路由与必要样式**

在 `AdminDashboard` 加入 accounts `DashboardView`，以 active + refreshKey 延迟加载。仅为筛选换行、表格操作间距、Drawer 描述区增加 scoped CSS；不得覆盖用户端样式或新建视觉体系。

- [ ] **Step 6: 验证账号管理界面**

```powershell
pnpm --filter @interview-agent/admin-console test -- AccountManagement.test.tsx account-api.test.ts admin-navigation.test.ts
pnpm --filter @interview-agent/admin-console lint
pnpm --filter @interview-agent/admin-console typecheck
```

预期：传统查询流、权限动作、密码入口限制和前端静态检查均通过。

## Task 7: 集成验证与浏览器验收

**Files:**

- Modify: `docs/superpowers/specs/2026-07-16-platform-governance-design.md`（仅在实施中出现与设计不符时同步）

**Interfaces:**

- Consumes: Task 1–6 的已生成 Prisma client、contracts 和 API/UI。
- Produces: 证据化的交付验证记录。

- [ ] **Step 1: 执行跨包质量门禁**

```powershell
pnpm db:validate
pnpm db:generate
pnpm contracts:check
pnpm --filter @interview-agent/product-api test
pnpm --filter @interview-agent/admin-console test
pnpm --filter @interview-agent/product-api typecheck
pnpm --filter @interview-agent/admin-console typecheck
pnpm --filter @interview-agent/admin-console lint
```

预期：所有命令退出码为 0；若工作区既有改动造成无关失败，记录具体命令、失败文件和与本任务的关系，不掩盖失败。

- [ ] **Step 2: 用真实开发环境烟测**

启动现有 `dev:local`（仅在服务未运行时），用 bootstrap 的本地 platform admin 登录 `http://localhost:3002`：确认侧栏仅增加“数据看板、账号管理”，能真实加载数据；普通 admin 访问平台 API 得到 403；禁用本地测试账号后其下一次 API 与登录均拒绝；OIDC 类型账号的密码入口不可用。

- [ ] **Step 3: 最终变更审查**

检查 `git diff --check`、本任务文件 diff 和 `git status --short`，确保只汇报本任务修改，不覆盖现有用户端未提交工作。用上述输出逐项对照设计文档的目标、权限、保护规则、API、UI 与测试验收。
