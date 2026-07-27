# User Agent Conversation Management Design

## Problem

历史对话重命名和删除由 UI 以 `void promise` 触发，但 hooks 不捕获 API reject：失败会形成未处理 Promise rejection，现有 `conversationError` 也不会更新。重命名输入同时监听 Enter 与 blur，慢请求期间可能重复提交；删除没有确认且不可撤销。

## Goal

让对话重命名/删除具备明确的成功 boolean、可见错误、成功后才更新 UI，并在客户端阻止重复提交和误删除。

## Non-goals

- 不修改对话 API、共享契约、数据库或服务端删除语义。
- 不增加撤销、软删除或批量管理。
- 不改变新建、选择和消息持久化流程。
- 不新增通知系统依赖；复用 drawer 已有 `conversationError`。

## Approach

新增无 React 依赖的 `conversation-management.ts`：

```ts
async function runConversationMutation<T>(input: {
  action: () => Promise<T>;
  fallbackMessage: string;
}): Promise<{ success: true; value: T } | { success: false; message: string }>;

function confirmConversationDeletion(title: string, confirm: (message: string) => boolean): boolean;
```

- mutation 不再 reject；Error 使用真实 message，非 Error 使用 fallback。
- rename/delete hooks 根据 result 设置或清除 `state.error`，成功才更新 summaries/activeConversation，并返回 boolean。
- Sidebar callback 类型改为 `Promise<boolean>`。
- rename editor 用 ref 锁：进行中不再次提交；只有 true 才退出编辑。
- delete 先展示包含对话标题的确认；确认后用同一 ref 防双击。

## Testing

- mutation 成功、Error 失败、非 Error fallback。
- 删除确认文案包含标题并返回 confirm 结果。
- 现有 User Agent runtime 与 drawer presentation 回归。
- 完整 User Portal 门禁。

## Constraints

- 函数不超过 50 行、文件不超过 300 行、嵌套不超过 3 层、位置参数不超过 3 个、圈复杂度不超过 10。
- 不执行 commit、push 或 PR。
