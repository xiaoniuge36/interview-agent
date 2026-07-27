# Practice Draft Recovery Design

## Problem

刷题播放器会在 React 内存中保留切题前的未保存回答，但刷新页面后会重新使用服务端答案，当前标签页内的未保存修改会丢失。现有切题确认文案已经承诺“保留本地草稿”，实际边界却只覆盖当前渲染生命周期。

## Goal

在同一浏览器标签页内恢复本轮练习的未保存回答和上次浏览题号；服务端保存成功后立即清除对应本地草稿，保存失败时继续保留。

## Non-goals

- 不上传未保存草稿，不修改 Product API、共享契约、Prisma schema 或迁移。
- 不跨标签页、浏览器或设备同步。
- 不替代显式“保存”动作，不把本地草稿计入服务端训练进度。
- 不引入依赖、后台定时器或 IndexedDB。

## Approach Decision

1. **按 session 保存单个 JSON 快照（采用）**：一个 `sessionStorage` key 保存题目草稿映射和当前题号。加载和清理集中，便于校验本轮题目。
2. **每题独立 key**：单次写入更小，但枚举、整轮清理和版本演进更复杂。
3. **服务端自动保存**：跨设备能力最好，但改变持久化语义、请求频率和共享契约，超出当前授权边界。

采用方案 1。练习题数量有限，JSON 快照足够轻；`sessionStorage` 的标签页生命周期也与本功能的隐私边界一致。

## Storage Model

key：`offerpilot:practice-local-state:<sessionId>`

```ts
type PracticeLocalState = {
  drafts: Record<string, string>;
  currentIndex: number | null;
};
```

- 空白草稿不写入；没有草稿且没有题号时删除 key。
- 读取时校验对象结构、字符串草稿和非负整数题号；损坏数据视为空状态。
- `sessionStorage` 不可用、配额受限或访问抛错时静默降级，正常刷题不能被本地恢复能力阻断。

## Restore Rules

1. 先从 Product API 获取 `PracticeSession`，服务端始终是已保存事实源。
2. 只接受当前 session 中真实存在的 item id，忽略过期或伪造条目。
3. 本地草稿仅在与服务端已保存答案不同且非空白时覆盖界面草稿。
4. 当前题号必须位于 `0 <= index < items.length`；否则使用现有 `initialPracticeItemIndex`。
5. 恢复到至少一条未保存草稿时显示“已恢复当前标签页内未保存的回答。”。

## Write and Clear Lifecycle

- 输入变化：同步更新 React state 和当前 session 的本地快照。
- 切题：同步保存当前题号。
- 单题服务端保存成功：清除该题本地草稿；失败路径不清除。
- AI 复盘或自学完成成功：清除整轮本地快照。
- 页面刷新：重新获取服务端 session 后合并本地快照。

## Testing

- helper：session 隔离、空白删除、损坏 JSON、存储异常、题号和单题/整轮清理。
- model：只恢复本轮有效且确实未保存的草稿；有效题号恢复；越界题号回退。
- 定向验证：helper 与播放器 model 测试。
- 完整门禁：User Portal ESLint、Vitest、TypeScript、Next.js build、Prettier、`git diff --check`。

## Constraints

- 函数不超过 50 行、文件不超过 300 行、嵌套不超过 3 层、位置参数不超过 3 个、圈复杂度不超过 10。
- 不执行 commit、push 或 PR。
