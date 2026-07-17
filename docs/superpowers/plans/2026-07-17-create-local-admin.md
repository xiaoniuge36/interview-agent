# Create Local Administrator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 允许平台管理员在现有账号管理页创建可登录的本地平台管理员或租户管理员。

**Architecture:** 在共享 contracts 中声明管理员创建输入与租户选项，在既有 AccountGovernanceService 的可串行化事务中创建 User、LocalCredential 和审计日志。Admin Console 复用账号 API 适配层与 Ant Design Modal，在成功后刷新同一账号列表。

**Tech Stack:** NestJS、Prisma、Zod、Next.js、React、Ant Design、Jest、Vitest。

---

### Task 1: 定义共享创建契约与租户选项

**Files:**
- Modify: packages/contracts/src/schemas/admin.ts
- Modify: packages/contracts/src/contracts.test.ts

- [ ] **Step 1: 先写失败的合约测试**

    assert.deepEqual(
      CreateLocalAdminInputSchema.parse({
        name: 'Admin One',
        email: 'ADMIN.ONE@example.com',
        password: 'initial-password',
        role: 'admin',
        tenantSlug: 'demo',
      }),
      {
        name: 'Admin One',
        email: 'admin.one@example.com',
        password: 'initial-password',
        role: 'admin',
        tenantSlug: 'demo',
      },
    );

同时断言 platform_admin 不接受 tenantSlug、admin 缺少 tenantSlug 会被拒绝。

- [ ] **Step 2: 运行合约测试确认 RED**

Run: pnpm --filter @interview-agent/contracts test

Expected: 测试因 CreateLocalAdminInputSchema 尚不存在而失败。

- [ ] **Step 3: 实现最小共享契约**

    export const TenantOptionSchema = z.object({
      id: z.string().min(1),
      name: z.string().min(1).max(CONTRACT_LIMITS.shortText),
      slug: z.string().min(1).max(CONTRACT_LIMITS.shortText),
    });

    export const CreateLocalAdminInputSchema = z
      .object({
        name: z.string().trim().min(2).max(80),
        email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
        password: z.string().min(1),
        role: z.enum(['admin', 'platform_admin']),
        tenantSlug: z.string().trim().min(1).max(CONTRACT_LIMITS.shortText).optional(),
      })
      .superRefine((input, context) => {
        if (input.role === 'admin' && !input.tenantSlug) {
          context.addIssue({ code: z.ZodIssueCode.custom, path: ['tenantSlug'], message: '请选择租户。' });
        }
        if (input.role === 'platform_admin' && input.tenantSlug) {
          context.addIssue({ code: z.ZodIssueCode.custom, path: ['tenantSlug'], message: '平台管理员固定归入系统租户。' });
        }
      });

导出 TenantOption、CreateLocalAdminInput 类型。

- [ ] **Step 4: 运行合约测试确认 GREEN**

Run: pnpm --filter @interview-agent/contracts test

Expected: 合约包测试通过。

### Task 2: 实现创建事务与管理接口

**Files:**
- Modify: apps/product-api/src/modules/admin/account-governance.service.ts
- Modify: apps/product-api/src/modules/admin/account-governance.helpers.ts
- Modify: apps/product-api/src/modules/admin/admin.controller.ts
- Modify: apps/product-api/src/modules/admin/account-governance.service.spec.ts
- Modify: apps/product-api/src/modules/admin/admin.controller.spec.ts

- [ ] **Step 1: 编写服务层失败测试**

测试平台管理员创建租户管理员时：

    await service.createLocalAdmin(context, {
      name: 'Tenant Admin',
      email: 'tenant-admin@example.com',
      password: 'initial-password',
      role: 'admin',
      tenantSlug: 'demo',
    });

断言目标租户被解析、User 与 LocalCredential 在同一事务中创建、密码哈希不进入审计数据、审计 action 为 account:local_admin_created。补充不存在租户与重复邮箱的失败断言。

- [ ] **Step 2: 运行服务测试确认 RED**

Run: pnpm --filter @interview-agent/product-api test -- account-governance.service.spec.ts

Expected: 测试因 createLocalAdmin 尚不存在而失败。

- [ ] **Step 3: 实现最小事务性创建逻辑**

在 AccountGovernanceService 新增：

    async createLocalAdmin(context: ProductRequestContext, input: CreateLocalAdminInput) {
      this.assert(context, 'account:write');
      const passwordHash = await hashPassword(input.password);
      return runSerializable(this.prisma, async (transaction) => {
        const tenant = await targetTenant(transaction, input);
        const user = await transaction.user.create({
          data: {
            tenantId: tenant.id,
            subject: 'local:' + randomUUID(),
            role: input.role,
            name: input.name,
            email: input.email,
          },
          include: ACCOUNT_INCLUDE,
        });
        await transaction.localCredential.create({
          data: { tenantId: tenant.id, userId: user.id, email: input.email, passwordHash },
        });
        await this.audit.record(context, {
          action: 'account:local_admin_created',
          resourceType: 'User',
          resourceId: user.id,
          metadata: { authSource: 'local', role: input.role, tenantSlug: tenant.slug },
        }, transaction);
        return mapAccount({ ...user, credential: { id: 'local' } });
      });
    }

将唯一冲突映射为 ACCOUNT_EMAIL_EXISTS；平台管理员查找 system 租户，租户管理员查找输入 tenantSlug。新增 tenantOptions 查询并限制为平台权限。

- [ ] **Step 4: 暴露受保护控制器接口**

新增以下 controller 方法，均使用 @Roles('platform_admin')：

    @Get('accounts/tenants')
    tenantOptions(@Req() request: ProductRequest) {
      return this.services.accounts.tenantOptions(request.context);
    }

    @Post('accounts/local-admin')
    createLocalAdmin(@Req() request: ProductRequest, @Body() body: unknown) {
      return this.services.accounts.createLocalAdmin(
        request.context,
        CreateLocalAdminInputSchema.parse(body),
      );
    }

- [ ] **Step 5: 运行 Product API 定向测试确认 GREEN**

Run: pnpm --filter @interview-agent/product-api test -- account-governance.service.spec.ts admin.controller.spec.ts

Expected: 创建、权限、审计、重复邮箱和 controller 输入解析测试通过。

### Task 3: 在现有账号管理页接入创建弹窗

**Files:**
- Modify: apps/admin-console/src/lib/account-api.ts
- Modify: apps/admin-console/src/lib/account-api.test.ts
- Create: apps/admin-console/src/components/dashboard/CreateLocalAdminModal.tsx
- Create: apps/admin-console/src/components/dashboard/useCreateLocalAdmin.ts
- Modify: apps/admin-console/src/components/dashboard/AccountManagement.tsx
- Modify: apps/admin-console/src/components/dashboard/AccountManagement.test.tsx
- Modify: apps/admin-console/src/app/styles/antd-admin.css

- [ ] **Step 1: 写失败的客户端请求与组件语义测试**

断言客户端 POST 请求：

    expect(createLocalAdminRequest({
      name: 'Admin One',
      email: 'admin.one@example.com',
      password: 'initial-password',
      role: 'platform_admin',
    })).toMatchObject({
      path: '/admin/accounts/local-admin',
      init: { method: 'POST' },
    });

静态渲染断言账号管理页显示“新增管理员”，弹窗包含“平台管理员”“租户管理员”“初始密码”。

- [ ] **Step 2: 运行 Admin Console 定向测试确认 RED**

Run: pnpm --filter @interview-agent/admin-console test -- account-api.test.ts AccountManagement.test.tsx

Expected: 测试因创建请求和弹窗尚不存在而失败。

- [ ] **Step 3: 实现请求适配与创建状态**

在 account-api.ts 增加：

    export function createLocalAdminRequest(input: CreateLocalAdminInput) {
      return {
        path: '/admin/accounts/local-admin',
        schema: AccountViewSchema,
        init: { method: 'POST', body: JSON.stringify(CreateLocalAdminInputSchema.parse(input)) },
      };
    }

新增租户选项 GET 请求。useCreateLocalAdmin 负责打开、关闭、提交、加载租户、成功提示和调用账号列表 reload。

- [ ] **Step 4: 实现窄范围创建弹窗**

CreateLocalAdminModal 使用 Ant Design Form 和 Modal：

    <Button icon={<UserAddOutlined />} type="primary" onClick={open}>
      新增管理员
    </Button>

角色为 platform_admin 时清除 tenantSlug 并隐藏租户字段；角色为 admin 时展示可搜索 Select。密码使用 Input.Password 并设置 autoComplete="new-password"。提交中禁用重复提交。

- [ ] **Step 5: 将入口接入现有标题区并补齐响应式样式**

AccountManagement 只负责将创建状态连接到现有 reload；弹窗组件独立存放，避免继续膨胀主页面文件。新增按钮在 768px 以下与标题说明纵向排列，表单字段保持单列可用。

- [ ] **Step 6: 运行 Admin Console 定向测试确认 GREEN**

Run: pnpm --filter @interview-agent/admin-console test -- account-api.test.ts AccountManagement.test.tsx

Expected: 创建请求与账号管理组件测试通过。

### Task 4: 集成验证

**Files:**
- Verify only: packages/contracts
- Verify only: apps/product-api
- Verify only: apps/admin-console

- [ ] **Step 1: 全量类型与质量检查**

Run: pnpm --filter @interview-agent/product-api typecheck && pnpm --filter @interview-agent/product-api lint && pnpm --filter @interview-agent/admin-console typecheck && pnpm --filter @interview-agent/admin-console lint

- [ ] **Step 2: 全量测试**

Run: pnpm --filter @interview-agent/product-api test && pnpm --filter @interview-agent/admin-console test

- [ ] **Step 3: 手工验收**

以平台管理员登录账号管理，创建一个测试租户管理员；确认成功提示、账号列表新增记录、详情显示本地账号与对应角色，并在审计日志中看到 account:local_admin_created。最后停用测试账号，保留审计记录。

- [ ] **Step 4: 差异检查**

Run: git diff --check
