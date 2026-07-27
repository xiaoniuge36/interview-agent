# Model Credential Action Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 模型连接测试/删除成功后立即反映主结果，列表刷新失败只作为部分同步提示。

**Architecture:** 新增纯 action orchestration 与 feedback model；面板 refresh 返回 boolean；卡片通过本地 update/remove callback 应用主结果。

**Tech Stack:** React 18、TypeScript 5、Vitest、现有 Model Credential API

## Global Constraints

- 主测试/删除失败时不进入成功后 refresh、不更新本地列表；测试失败 catch 可尽力刷新诊断状态。
- 主操作成功后必须保留结果；refresh false/reject 不得转成主操作失败。
- 测试成功按 id 更新服务端 credential view；删除成功立即移除 id。
- 保留删除确认与现有 error fallback。
- 不修改 Product API、共享契约、Prisma schema、迁移、根配置、依赖或 CI。
- 函数不超过 50 行、文件不超过 300 行、嵌套不超过 3 层、位置参数不超过 3 个、圈复杂度不超过 10。
- 本会话不执行 commit、push 或 PR。

---

### Task 1: Action 与反馈模型

**Files:**

- Create: `apps/user-portal/src/components/settings/model-credential-action.ts`
- Create: `apps/user-portal/src/components/settings/model-credential-action.test.ts`

**Interfaces:**

- Produces: `runCredentialAction(input)`、`credentialActionOutcome(kind, synchronized)`。

- [x] **Step 1: 写失败测试**

覆盖主操作失败不刷新、完整成功、refresh false、refresh reject，以及 test/remove 部分同步文案。

- [x] **Step 2: 运行测试确认 RED**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/components/settings/model-credential-action.test.ts`  
Expected: FAIL，模块不存在。

- [x] **Step 3: 实现最小模型**

```ts
export async function runCredentialAction<T>(input: {
  action: () => Promise<T>;
  refresh: () => Promise<boolean>;
}): Promise<{ result: T; synchronizationComplete: boolean }>;

export function credentialActionOutcome(
  kind: 'test' | 'remove',
  synchronizationComplete: boolean,
): { tone: 'success' | 'info'; message: string; notificationDetail: string };
```

- [x] **Step 4: 运行模型测试确认 GREEN**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/components/settings/model-credential-action.test.ts`  
Expected: PASS。

### Task 2: 面板与卡片接入

**Files:**

- Modify: `apps/user-portal/src/components/settings/ModelConnectionsPanel.tsx`
- Modify: `apps/user-portal/src/components/settings/ModelCredentialCard.tsx`
- Modify: `apps/user-portal/src/components/settings/ModelCredentialCard.test.tsx`

**Interfaces:**

- Consumes: Task 1 model。
- Produces: `refresh(): Promise<boolean>`、`onUpdated`、`onRemoved` 本地列表回调。

- [x] **Step 1: 让 refresh 返回明确结果**

成功 return true；catch 设置 error 后 return false；finally 继续解除 loading。

- [x] **Step 2: 添加本地结果回调**

测试成功按 id map 替换 credential；删除成功按 id filter；把 callback 传入卡片。

- [x] **Step 3: 卡片使用 action model**

测试/删除通过 `runCredentialAction` 执行。helper resolve 后先应用本地回调，再按 `credentialActionOutcome` 设置 message 与 success/info 通知；catch 仅处理主操作失败。

- [x] **Step 4: 更新组件测试 props 并运行定向测试**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/components/settings/model-credential-action.test.ts src/components/settings/ModelCredentialCard.test.tsx src/components/settings/ModelReadinessBanner.test.tsx`  
Expected: PASS。

### Task 3: User Portal 完整门禁

- [x] **Step 1: Prettier 与 `git diff --check`**
- [x] **Step 2: ESLint 与完整 Vitest**
- [x] **Step 3: TypeScript 与 Next.js 生产构建**
- [x] **Step 4: 最终 diff 审查并记录证据**

## Verification Evidence

- RED：action/feedback 测试因缺少 `model-credential-action` 模块失败。
- 定向 GREEN：3 个测试文件、11 项测试通过。
- 完整 Vitest：60 个测试文件、183 项测试通过。
- ESLint、TypeScript、Next.js 生产构建通过；构建生成 14 个静态页面。
- 主操作 reject 不进入成功同步；refresh false/reject 保留主结果；测试成功 upsert、删除成功 remove 均直接更新本地列表。
- Prettier 与 `git diff --check` 已执行；相关生产文件均少于 300 行。
