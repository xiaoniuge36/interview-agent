# C 端 Agent 工作台与 BYOK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付面向个人求职者的 Agent 工作台，以及加密持久化、可测试并真实调用的用户自备模型凭证能力。

**Architecture:** Product API 成为唯一的密钥持有者和 Provider 调用点：用户凭证 AES-256-GCM 加密存储，读取 API 只返回脱敏视图。面试命令从凭证服务获得已验证默认连接，由 Provider 适配器生成现有运行时决策；用户门户通过设置中心管理连接，并重构首页和档案的 Agent 体验。

**Tech Stack:** Next.js App Router、React、TypeScript、NestJS、Prisma/PostgreSQL、Zod、Node `crypto` 与内置 `fetch`。

## Global Constraints

- API Key 只能在写入请求与 Product API 进程内短暂存在；不得出现在日志、错误、审计 metadata、数据库明文字段、前端状态或读取 API。
- 使用 AES-256-GCM、随机 12 字节 IV、16 字节 Tag 和版本化 base64 主密钥；生产环境缺失有效主密钥必须启动失败。
- Provider 仅允许 OpenAI、Anthropic、DeepSeek、通义千问和 OpenAI-compatible 自定义端点；自定义地址必须为 HTTPS（开发环境可允许 localhost）。
- C 端统一使用确认的深色侧栏、暖白内容区、`#2F6BFF` 主按钮与 `#6EE7C8` 状态色；移动端不得出现水平滚动。
- 不更改或覆盖当前工作区中与本任务无关的未提交修改。

---

## File Structure

| 路径 | 职责 |
| --- | --- |
| `packages/contracts/src/schemas/model-credential.ts` | 用户模型连接的请求、脱敏响应和 Provider schema。 |
| `apps/product-api/prisma/schema/identity.prisma` | `UserModelCredential` 与 Tenant/User 关系。 |
| `apps/product-api/src/modules/model-credential/*` | 加密、CRUD、测试连接、访问控制和 Provider 调用。 |
| `apps/product-api/src/modules/agent-runtime/*` | 以真实模型客户端替换生产生成路径，保留可控 fallback。 |
| `apps/user-portal/src/app/(app)/settings/page.tsx` | 设置路由。 |
| `apps/user-portal/src/components/settings/*` | 模型连接表、对话框、设置状态与表单。 |
| `apps/user-portal/src/components/home/*` | Agent 首页信息层级。 |
| `apps/user-portal/src/components/profile/*` | Agent 档案与真实资料编辑。 |
| `apps/user-portal/src/app/styles/*` | 设计令牌、布局、表单、移动端样式。 |

## Task 1: 凭证合同、权限、数据模型与加密基元

**Files:**
- Create: `packages/contracts/src/schemas/model-credential.ts`
- Modify: `packages/contracts/src/index.ts`, `packages/contracts/src/schemas/context.ts`
- Modify: `apps/product-api/prisma/schema/identity.prisma`, `apps/product-api/prisma/schema/migrations/<timestamp>_user_model_credentials/migration.sql`
- Create: `apps/product-api/src/modules/model-credential/credential-crypto.service.ts`
- Test: `packages/contracts/src/model-credential.test.ts`, `apps/product-api/src/modules/model-credential/credential-crypto.service.spec.ts`

**Interfaces:**
- Produces `CreateModelCredentialInputSchema`, `UpdateModelCredentialInputSchema`, `ModelCredentialViewSchema`, `ModelCredentialListSchema`.
- Produces `CredentialCryptoService.encrypt(secret)` and `CredentialCryptoService.decrypt(record)`; both operate on `Buffer` and never log input.

- [ ] **Step 1: 写失败合同与加密测试**

```ts
expect(CreateModelCredentialInputSchema.safeParse({ provider: 'openai', model: 'gpt-4.1' }).success).toBe(false);
expect(ModelCredentialViewSchema.parse({ id: 'c1', provider: 'openai', model: 'gpt-4.1', keyHint: '••••7K9m', status: 'verified', isDefault: true })).not.toHaveProperty('apiKey');
expect(crypto.decrypt(crypto.encrypt('sk-secret'))).toBe('sk-secret');
```

- [ ] **Step 2: 运行失败测试**

Run: `pnpm --filter @interview-agent/contracts test -- model-credential.test.ts && pnpm --filter @interview-agent/product-api test -- credential-crypto.service.spec.ts`

Expected: FAIL，因为 schema、crypto service 和 Prisma 字段尚不存在。

- [ ] **Step 3: 实现版本化 AES-GCM 与 Prisma 模型**

```ts
const cipher = createCipheriv('aes-256-gcm', this.key, randomBytes(12));
const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
return { ciphertext, iv, authTag: cipher.getAuthTag(), keyVersion: this.version };
```

`UserModelCredential` 必须以 `(tenantId, userId, id)` 复合唯一键隔离；密文字段使用 `Bytes`，`keyHint` 只保存 `••••` 加最后四位。

- [ ] **Step 4: 运行通过测试与 Prisma 校验**

Run: `pnpm --filter @interview-agent/contracts test -- model-credential.test.ts; pnpm --filter @interview-agent/product-api test -- credential-crypto.service.spec.ts; pnpm --filter @interview-agent/product-api prisma:validate`

Expected: PASS；随机 IV 每次不同，明文不在持久化结构中。

## Task 2: 用户模型连接 API 与连接测试

**Files:**
- Create: `apps/product-api/src/modules/model-credential/model-credential.controller.ts`
- Create: `apps/product-api/src/modules/model-credential/model-credential.service.ts`
- Create: `apps/product-api/src/modules/model-credential/model-provider.client.ts`
- Create: `apps/product-api/src/modules/model-credential/model-credential.module.ts`
- Modify: `apps/product-api/src/app.module.ts`, `apps/product-api/src/common/context/request-context.ts`, `apps/product-api/src/common/config/environment.ts`
- Test: `apps/product-api/src/modules/model-credential/model-credential.service.spec.ts`, `apps/product-api/src/modules/model-credential/model-provider.client.spec.ts`

**Interfaces:**
- Consumes Task 1 schemas and `CredentialCryptoService`.
- Produces authenticated `/model-credentials` GET/POST/PATCH/DELETE、`/model-credentials/:id/test` POST 和 `resolveDefault(context)`。

- [ ] **Step 1: 写失败的所有权与脱敏测试**

```ts
await expect(service.get(otherUserContext, credential.id)).rejects.toThrow(NotFoundException);
expect(await service.list(ownerContext)).toEqual([expect.objectContaining({ keyHint: '••••7K9m' })]);
expect(JSON.stringify(await service.list(ownerContext))).not.toContain('sk-real-secret');
```

- [ ] **Step 2: 写失败 Provider 请求测试**

```ts
await client.test({ provider: 'openai', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', model: 'gpt-4.1' });
expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/chat/completions'), expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer sk-test' }) }));
```

- [ ] **Step 3: 实现 CRUD、默认项事务和 Provider 健康检查**

`POST` 仅接受一次原始 `apiKey`；创建/更新时加密。设默认项用 serializable transaction 清除同用户其它默认值。测试请求使用最小非流式 prompt，Provider 失败映射为稳定的 `MODEL_CONNECTION_*` 错误码，记录的审计 metadata 仅包含 provider、model、credentialId、outcome。

- [ ] **Step 4: 运行通过测试**

Run: `pnpm --filter @interview-agent/product-api test -- model-credential.service.spec.ts model-provider.client.spec.ts; pnpm --filter @interview-agent/product-api typecheck`

Expected: PASS；用户不能跨租户访问，任何 API 读取响应均不可反序列化出 API Key。

## Task 3: 真实面试模型调用与安全降级

**Files:**
- Create: `apps/product-api/src/modules/agent-runtime/user-model-runtime.client.ts`
- Modify: `apps/product-api/src/modules/agent-runtime/agent-runtime.client.ts`, `apps/product-api/src/modules/agent-runtime/agent-runtime.module.ts`
- Modify: `apps/product-api/src/modules/interview/interview-command.service.ts`
- Test: `apps/product-api/src/modules/agent-runtime/user-model-runtime.client.spec.ts`, `apps/product-api/src/modules/interview/interview-command.service.spec.ts`

**Interfaces:**
- Consumes `ModelCredentialService.resolveDefault(context)` and `ModelProviderClient.complete(input)`.
- Produces existing `AgentNextResult` so interview persistence and SSE remain unchanged.

- [ ] **Step 1: 写失败的真实调用选择测试**

```ts
await expect(client.next({ session, commandId: 'cmd-1', traceId: 'trace-1234' })).rejects.toMatchObject({ code: 'MODEL_CONNECTION_REQUIRED' });
expect(provider.complete).toHaveBeenCalledWith(expect.objectContaining({ responseSchema: AgentRuntimeNextResponseSchema }));
```

- [ ] **Step 2: 实现 Provider 适配**

OpenAI、DeepSeek、通义千问与 custom 使用 `/chat/completions`；Anthropic 使用 `/v1/messages`。系统 prompt 要求只返回已验证的 JSON 决策。调用结束后以 `AgentRuntimeNextResponseSchema.parse()` 校验；无连接、未验证、超时、429、上游 4xx/5xx 分别保留遥测但不得记录上游 body 或 key。

- [ ] **Step 3: 保留现有 Runtime 的显式回退边界**

```ts
if (this.userModels.isConfigured(input.session)) return this.userModels.next(input);
if (this.fallbackEnabled) return this.runtime.next(input);
throw modelConnectionRequired();
```

生产环境不得开启确定性 fallback；开发/测试 fallback 行为保持现有测试覆盖。

- [ ] **Step 4: 运行通过测试**

Run: `pnpm --filter @interview-agent/product-api test -- user-model-runtime.client.spec.ts interview-command.service.spec.ts; pnpm --filter @interview-agent/product-api typecheck`

Expected: PASS；真实模型输出可沿用现有会话、事件与报告持久化路径。

## Task 4: 设置中心与 C 端 API 连接状态

**Files:**
- Create: `apps/user-portal/src/app/(app)/settings/page.tsx`
- Create: `apps/user-portal/src/components/settings/ModelConnectionsPanel.tsx`
- Create: `apps/user-portal/src/components/settings/ModelConnectionDialog.tsx`
- Create: `apps/user-portal/src/components/settings/model-connection-form.ts`
- Create: `apps/user-portal/src/lib/model-credentials-api.ts`
- Modify: `apps/user-portal/src/components/shell/navigation.ts`, `apps/user-portal/src/components/UserShell.tsx`, `apps/user-portal/src/app/styles/shell.css`, `apps/user-portal/src/app/styles/responsive.css`
- Test: `apps/user-portal/src/components/settings/model-connection-form.test.ts`, `apps/user-portal/src/lib/model-credentials-api.test.ts`

**Interfaces:**
- Consumes Task 1 `ModelCredential*` contracts and Task 2 endpoints.
- Produces a fully working model connection CRUD/test/default UI; forms never persist plaintext API key after the write request resolves.

- [ ] **Step 1: 写表单验证与脱敏 API 失败测试**

```ts
expect(validateModelConnection({ provider: 'openai', model: '', apiKey: '' })).toEqual(expect.objectContaining({ model: expect.any(String), apiKey: expect.any(String) }));
expect(await listModelCredentials()).toEqual([expect.objectContaining({ keyHint: '••••7K9m' })]);
```

- [ ] **Step 2: 构建设置路由与受控对话框**

实现“AI 模型 / 账号与安全 / 通知”选项卡，提供新增、编辑、测试、设默认、停用、删除确认。成功 toast、失败 inline 提示和加载状态使用一致文案；输入框在提交后立即 `reset()`，列表只接收脱敏视图。

- [ ] **Step 3: 接入导航与缺少配置引导**

在侧栏加入“设置”。当面试 API 返回 `MODEL_CONNECTION_REQUIRED` 时，展示“先连接一个 AI 模型才能开始模拟”的可点击行动，目标为 `/settings?tab=models`。

- [ ] **Step 4: 运行通过测试与类型检查**

Run: `pnpm --filter @interview-agent/user-portal test -- model-connection-form.test.ts model-credentials-api.test.ts; pnpm --filter @interview-agent/user-portal typecheck`

Expected: PASS；界面没有 API Key 明文回填或 LocalStorage 写入。

## Task 5: Agent 首页与档案重设计

**Files:**
- Modify: `apps/user-portal/src/components/home/HomePageContent.tsx`, `apps/user-portal/src/components/home/HeroSection.tsx`
- Create: `apps/user-portal/src/components/home/AgentMemoryPanel.tsx`, `apps/user-portal/src/components/home/NextActionCard.tsx`
- Modify: `apps/user-portal/src/components/profile/ProfilePageContent.tsx`, `apps/user-portal/src/components/profile/ProfilePanel.tsx`
- Create: `apps/user-portal/src/components/profile/AgentMemorySummary.tsx`
- Modify: `apps/user-portal/src/app/styles/tokens.css`, `apps/user-portal/src/app/styles/primitives.css`, `apps/user-portal/src/app/styles/shell.css`, `apps/user-portal/src/app/styles/responsive.css`
- Test: `apps/user-portal/src/components/home/home-next-action.test.ts`, `apps/user-portal/src/components/profile/agent-memory-summary.test.ts`

**Interfaces:**
- Consumes existing workspace profile/job/interview data and credential summary from Task 4.
- Produces next action selection and Agent memory UI without changing profile/job API payloads.

- [ ] **Step 1: 写失败状态选择测试**

```ts
expect(resolveNextAction({ hasCredential: false, hasProfile: true, hasJob: true, activeSession: null })).toMatchObject({ href: '/settings?tab=models', label: '连接 AI 模型' });
expect(resolveNextAction({ hasCredential: true, hasProfile: true, hasJob: true, activeSession })).toMatchObject({ href: '/interview', label: '继续模拟' });
```

- [ ] **Step 2: 实施主页与档案组件**

主页优先展示最值得做的一步、准备记忆时间线和右侧 Agent Memory；档案将资料分成求职目标、核心技能和代表经历，右侧明确展示“Agent 已记住”。表单继续调用现有画像 API，保存文案改为“保存并更新 Agent 记忆”。

- [ ] **Step 3: 提炼视觉令牌与响应式规则**

```css
:root { --surface: #f7f8fa; --ink: #111827; --primary: #2f6bff; --signal: #6ee7c8; --sidebar: #0b1220; }
@media (max-width: 860px) { .app-sidebar { transform: translateX(-100%); } .agent-grid { grid-template-columns: 1fr; } }
```

- [ ] **Step 4: 运行通过测试与构建**

Run: `pnpm --filter @interview-agent/user-portal test -- home-next-action.test.ts agent-memory-summary.test.ts; pnpm --filter @interview-agent/user-portal build`

Expected: PASS；主页、档案、设置在窄屏无横向溢出。

## Task 6: 整合验证、视觉验收与安全复核

**Files:**
- Modify: `README.md`, `.env.example`
- Create: `docs/verification/2026-07-15-user-agent-workspace.md`

- [ ] **Step 1: 验证没有凭证泄漏**

Run: `rg -n "sk-[A-Za-z0-9]|apiKey.*console|console.*apiKey" apps packages -g '!**/node_modules/**'`

Expected: 不存在测试夹具以外的密钥字面量、key logging 或前端持久化。

- [ ] **Step 2: 运行定向与全量质量门禁**

Run: `pnpm --filter @interview-agent/contracts test; pnpm --filter @interview-agent/product-api test; pnpm --filter @interview-agent/product-api typecheck; pnpm --filter @interview-agent/user-portal test; pnpm --filter @interview-agent/user-portal typecheck; pnpm --filter @interview-agent/user-portal build`

Expected: 全部 PASS；若集成数据库不可用，记录未执行的命令及原因。

- [ ] **Step 3: 浏览器验收**

启动本地用户门户，验证桌面与 390px 宽度下：首页下一步、设置新增/测试/默认操作、档案保存、未配置模型引导与启动模拟。截图与获确认的概念逐项比对：侧栏、首屏层级、主要 CTA、Agent Memory、表单密度、响应式布局。

- [ ] **Step 4: 更新用户文档**

README 说明 `CREDENTIAL_ENCRYPTION_KEY` 的生成方式、生产环境不得使用示例值、Provider 支持范围、密钥不会回显、如何删除连接和真实调用的失败处理。

## Plan Self-review

- 覆盖性：Task 1-3 覆盖真实调用与全部安全边界；Task 4-5 覆盖确认的 C 端设置、首页、档案体验；Task 6 覆盖安全、测试和视觉验收。
- 无占位内容：每个任务给出了路径、消费/产生的接口、失败测试、实现边界和可运行验证命令。
- 类型一致性：`ModelCredential*` contracts 由 Task 1 生产，Task 2 API、Task 3 resolver 和 Task 4 客户端共用；`AgentNextResult` 保持既有面试持久化边界。
