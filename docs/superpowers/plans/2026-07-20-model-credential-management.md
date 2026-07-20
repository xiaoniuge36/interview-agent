# 模型连接管理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让后台 Agent 助手内已添加的模型连接可安全编辑、测试、启停、设为默认和删除，同时保持 API Key 仅以加密密文保存。

**Architecture:** Product API 继续作为凭证事实源，复用 `UserModelCredential` 的 AES-256-GCM 密文、审计和默认模型回退逻辑。扩展既有更新契约以允许服务商切换，并在 Admin Console 的助手设置入口新增连接管理弹窗；前端仅接收 `keyHint`，密钥输入只用于写入或轮换。

**Tech Stack:** NestJS、Prisma、Zod contracts、Next.js、React、Ant Design、Jest、Vitest。

## Global Constraints

- 不新增 Prisma schema、迁移、独立后台系统或浏览器端密钥存储。
- API Key 不得出现在列表、编辑初始值、接口视图、审计 metadata、Agent 对话或错误详情中。
- 连接参数或密钥变更后必须重置为 `unverified`，需要测试成功后才能成为默认模型。
- 删除默认连接沿用现有已验证连接回退和 AI 调用引用解绑逻辑。
- 不提交、推送或修改无关工作区文件。

---

### Task 1: 扩展模型连接更新契约与后端状态转换

**Files:**
- Modify: `packages/contracts/src/schemas/model-credential.ts`
- Modify: `packages/contracts/src/model-credential.test.ts`
- Modify: `apps/product-api/src/modules/model-credential/model-credential.service.ts`
- Modify: `apps/product-api/src/modules/model-credential/model-credential.service.spec.ts`

**Interfaces:**
- Consumes: `PATCH /model-credentials/:credentialId` 的 `UpdateModelCredentialInputSchema`。
- Produces: `provider?: ModelProvider` 可安全更新；非兼容端点服务商清除 `baseUrl`，任一连接参数变化均重置验证状态。

- [ ] **Step 1: 写契约失败测试**

```ts
const parsed = UpdateModelCredentialInputSchema.safeParse({
  provider: 'openai_compatible',
  model: 'custom-chat',
});
assert.equal(parsed.success, false);
```

- [ ] **Step 2: 运行契约测试确认失败**

Run: `pnpm --filter @interview-agent/contracts test -- model-credential.test.js`

Expected: 新增 provider 场景在当前契约中不被解析或未要求 Base URL。

- [ ] **Step 3: 实现更新验证和服务层字段映射**

```ts
provider: ModelProviderSchema.optional(),
// superRefine: provider === 'openai_compatible' 时必须同时提交 HTTPS baseUrl

...(input.provider ? { provider: input.provider } : {}),
...(input.provider && input.provider !== 'openai_compatible'
  ? { baseUrl: null }
  : input.baseUrl !== undefined ? { baseUrl: input.baseUrl } : {}),
```

- [ ] **Step 4: 补服务层回归测试**

```ts
await service.update(context, 'credential-1', {
  provider: 'qwen',
  model: 'qwen-plus',
});
expect(transaction.userModelCredential.update).toHaveBeenCalledWith(
  expect.objectContaining({
    data: expect.objectContaining({ provider: 'qwen', baseUrl: null, status: 'unverified' }),
  }),
);
```

- [ ] **Step 5: 验证 Task 1**

Run: `pnpm --filter @interview-agent/contracts test -- model-credential.test.js`

Run: `pnpm --filter @interview-agent/product-api test -- model-credential.service.spec.ts`

Expected: 契约和服务层测试通过，密钥明文断言仍只出现在测试输入中。

### Task 2: 补齐管理端模型连接 API 适配层

**Files:**
- Modify: `apps/admin-console/src/lib/admin-page-agent-api.ts`
- Create: `apps/admin-console/src/lib/admin-page-agent-api.test.ts`

**Interfaces:**
- Consumes: `UpdateModelCredentialInputSchema`、`ModelCredentialViewSchema`、`DELETE /model-credentials/:id`。
- Produces: `updateAdminModelCredential()` 和 `deleteAdminModelCredential()`，供模型连接管理组件调用。

- [ ] **Step 1: 写 API 适配失败测试**

```ts
expect(request.path).toBe('/model-credentials/credential-1');
expect(request.init?.method).toBe('PATCH');
expect(JSON.parse(String(request.init?.body))).not.toHaveProperty('keyHint');
```

- [ ] **Step 2: 实现写操作 API**

```ts
export function updateAdminModelCredential(id: string, input: UpdateModelCredentialInput) {
  return adminRequest({
    path: `/model-credentials/${encodeURIComponent(id)}`,
    schema: ModelCredentialViewSchema,
    init: { method: 'PATCH', body: JSON.stringify(UpdateModelCredentialInputSchema.parse(input)) },
  });
}

export function deleteAdminModelCredential(id: string): Promise<null> {
  return adminRequest({ path: `/model-credentials/${encodeURIComponent(id)}`, schema: z.null(), init: { method: 'DELETE' } });
}
```

- [ ] **Step 3: 验证 Task 2**

Run: `pnpm --filter @interview-agent/admin-console test -- admin-page-agent-api.test.ts`

Expected: PATCH 与 DELETE 只使用站内 API 路径，编辑请求不包含任何回显密钥。

### Task 3: 实现模型连接管理与安全编辑表单

**Files:**
- Create: `apps/admin-console/src/components/admin-agent/ModelCredentialForm.tsx`
- Create: `apps/admin-console/src/components/admin-agent/model-credential-form-model.ts`
- Create: `apps/admin-console/src/components/admin-agent/model-credential-form-model.test.ts`
- Create: `apps/admin-console/src/components/admin-agent/AdminAgentCredentialManager.tsx`
- Modify: `apps/admin-console/src/components/admin-agent/AdminAgentSetup.tsx`
- Modify: `apps/admin-console/src/components/admin-agent/AdminAgentWidget.tsx`
- Modify: `apps/admin-console/src/app/styles/admin-agent.css`

**Interfaces:**
- Consumes: `listAdminModelCredentials`、`createAdminModelCredential`、`updateAdminModelCredential`、`testAdminModelCredential`、`deleteAdminModelCredential`。
- Produces: `toCredentialUpdateInput(values)` 省略空 API Key，和由现有设置按钮打开的 `AdminAgentCredentialManager`；变更后调用 `reloadConfig()` 让 Agent 使用最新默认连接。

- [ ] **Step 1: 写安全表单模型测试**

```ts
expect(toCredentialUpdateInput({ apiKey: '', provider: 'openai', model: 'gpt-4.1-mini', isDefault: false })).toEqual({
  provider: 'openai',
  model: 'gpt-4.1-mini',
  baseUrl: null,
  isDefault: false,
});
expect(toCredentialUpdateInput({ apiKey: 'sk-rotated-secret', provider: 'openai', model: 'gpt-4.1-mini', isDefault: false })).toEqual({
  provider: 'openai',
  apiKey: 'sk-rotated-secret',
  model: 'gpt-4.1-mini',
  baseUrl: null,
  isDefault: false,
});
```

- [ ] **Step 2: 实现可复用编辑表单**

```tsx
<Form.Item label="API Key（留空则不修改）" name="apiKey">
  <Input.Password autoComplete="new-password" placeholder="仅在轮换密钥时填写" />
</Form.Item>
```

编辑初始值只包含 `provider`、`model`、`baseUrl` 和 `isDefault`，不得将 `keyHint` 当作 API Key 写回表单。

- [ ] **Step 3: 实现管理弹窗列表与危险操作确认**

```tsx
<Popconfirm
  description={credential.isDefault ? '删除后系统会自动选择另一条已验证连接作为默认模型。' : '删除后无法恢复该模型连接。'}
  okText="删除连接"
  onConfirm={() => void removeCredential(credential)}
  title={`确认删除 ${credential.model}？`}
>
  <Button danger type="link">删除</Button>
</Popconfirm>
```

每条连接展示状态、默认标记、`keyHint`、最近测试时间和错误码；提供编辑、测试、设为默认、启用或停用、删除操作。所有操作完成后刷新列表并调用 `onChanged()`。

- [ ] **Step 4: 将现有设置入口接入管理弹窗**

```tsx
<AdminAgentCredentialManager
  onChanged={reloadConfig}
  onClose={() => setModelManagerOpen(false)}
  open={modelManagerOpen}
/>
```

当列表为空时显示“新增模型连接”；原 `AdminAgentSetup` 仅作为新增或编辑表单承载，不再是唯一入口。

- [ ] **Step 5: 验证 Task 3**

Run: `pnpm --filter @interview-agent/admin-console test -- model-credential-form-model.test.ts`

Expected: 编辑留空 API Key 不会提交密钥字段；删除默认连接出现明确二次确认；列表只渲染 `keyHint`。

### Task 4: 集成验证与安全回归

**Files:**
- Modify: `apps/product-api/src/modules/model-credential/model-credential.service.spec.ts`
- Modify: `apps/admin-console/src/components/admin-agent/model-credential-form-model.test.ts`

**Interfaces:**
- Consumes: Task 1 的更新契约和 Task 3 的管理组件。
- Produces: 覆盖编辑、删除、密钥掩码和状态重测的回归门禁。

- [ ] **Step 1: 覆盖密钥不回显与轮换状态**

```ts
const payload = toCredentialUpdateInput({
  apiKey: '',
  provider: 'openai',
  model: 'gpt-4.1-mini',
  isDefault: false,
});
expect('apiKey' in payload).toBe(false);
expect(updated.status).toBe('unverified');
```

- [ ] **Step 2: 运行范围测试与静态检查**

Run: `pnpm --filter @interview-agent/contracts test -- model-credential.test.js`

Run: `pnpm --filter @interview-agent/product-api test -- model-credential`

Run: `pnpm --filter @interview-agent/admin-console test -- model-credential-form-model.test.ts admin-page-agent-api.test.ts`

Run: `pnpm --filter @interview-agent/admin-console lint`

Run: `pnpm --filter @interview-agent/admin-console typecheck`

Expected: 所有范围测试、lint 和 typecheck 通过。

- [ ] **Step 3: 运行交付门禁**

Run: `pnpm --filter @interview-agent/admin-console build`

Run: `pnpm --filter @interview-agent/product-api lint`

Run: `pnpm --filter @interview-agent/product-api typecheck`

Expected: Admin Console production build 和 Product API 静态检查通过；如果 Prisma DLL 被运行中的服务锁定，报告为环境限制，不停止现有服务。
