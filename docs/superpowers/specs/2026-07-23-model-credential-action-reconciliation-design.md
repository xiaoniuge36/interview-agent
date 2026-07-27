# Model Credential Action Reconciliation Design

## Problem

模型连接卡片把“测试/删除主操作”和“重新读取列表”放在同一个成功链路中。面板的 `refresh()` 又会吞掉列表错误并 resolve，导致卡片无法识别部分成功：测试已通过但仍显示旧状态，或删除已完成但旧卡片仍留在页面。若其他调用方让 refresh reject，当前 catch 还会把主操作误报为失败。

## Goal

明确区分模型连接主操作与列表同步：测试或删除成功后立即使用主结果更新本地列表；刷新失败只标记“稍后同步”，绝不把已成功的主操作改写为失败。

## Non-goals

- 不修改模型凭据 API、共享契约、加密存储或测试逻辑。
- 不引入全局状态库、轮询或后台重试。
- 不改变删除前确认、编辑器或默认模型规则。
- 不让主操作失败继续执行本地更新或列表刷新。

## Approach Decision

1. **标准化 action helper + 本地结果应用（采用）**：helper 先执行主操作，再执行返回 boolean 的 refresh；主结果用于本地 upsert/remove。
2. **仅让 refresh rethrow**：能发现同步失败，但仍可能进入主操作 catch 并误报失败。
3. **只做乐观本地更新，不再 refresh**：体验快，但失去服务端排序、默认模型联动和其他状态对账。

采用方案 1。它保留对账能力，并把主操作/同步边界变成可单测接口。

## Interfaces

```ts
type CredentialActionResult<T> = {
  result: T;
  synchronizationComplete: boolean;
};

async function runCredentialAction<T>(input: {
  action: () => Promise<T>;
  refresh: () => Promise<boolean>;
}): Promise<CredentialActionResult<T>>;
```

- `action` reject：helper reject，不调用成功后 refresh。卡片可在测试失败 catch 中单独做一次尽力刷新，以读取服务端记录的 `lastErrorCode`。
- `action` resolve：调用 refresh；refresh 返回 false 或意外 reject 都转为 `synchronizationComplete: false`，主结果仍 resolve。

面板接口调整：

- `refresh(): Promise<boolean>`：成功写入列表并返回 true；失败设置面板 error 并返回 false。
- `onUpdated(credential)`：按 id 原位替换测试后的服务端视图。
- `onRemoved(id)`：删除成功后立即从本地列表移除。

## Feedback

- 测试 + 同步成功：`模型连接测试成功` / `连接测试成功，已可用于 Agent 任务。`
- 测试成功、同步待完成：info 通知；`连接测试已成功，列表状态将在下次刷新时继续同步。`
- 删除成功：卡片立即消失；同步完整用 success，否则用 info 说明服务端已删除、列表稍后对齐。
- 主测试/删除失败：保留现有 error 通知与错误详情。

## Testing

- helper：主操作失败不刷新；完全成功；refresh false；refresh reject。
- feedback model：test/remove 的完整与部分同步 tone/copy。
- 组件静态测试更新新的 callback 契约。
- 完整门禁：User Portal ESLint、Vitest、TypeScript、Next.js build、Prettier、`git diff --check`。

## Constraints

- 函数不超过 50 行、文件不超过 300 行、嵌套不超过 3 层、位置参数不超过 3 个、圈复杂度不超过 10。
- 不执行 commit、push 或 PR。
