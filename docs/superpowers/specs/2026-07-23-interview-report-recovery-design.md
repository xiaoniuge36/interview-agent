# Interview Report Recovery Design

## Problem

恢复历史模拟面试时，前端先读取 session，再在 `report_ready` 状态读取报告。当前两个步骤共用一个 try/catch：报告读取的临时失败会丢弃已经成功取得的 session，整场恢复被判定失败，对话记录和完成状态都无法展示。直播 `report_ready` 同步也用严格 `Promise.all`，有同类问题。

## Goal

把 session 作为可独立展示的主事实：session 成功后始终恢复对话与状态；报告读取失败只让报告面板进入“已生成、暂时无法读取”状态，不否定整场面试。

## Non-goals

- 不修改 Product API、共享契约、报告生成、SSE 事件或数据库。
- 不增加自动轮询或后台重试。
- 不伪造报告内容、分数或建议。
- 不把 session 读取失败降级为成功。

## Approach Decision

1. **共享 snapshot 对账 helper（采用）**：依次读取 session/report，返回 `error | ready | partial` 语义；历史恢复和直播同步复用。
2. **两个调用点各自拆 try/catch**：改动少，但错误语义会重复并可能再次漂移。
3. **报告失败时自动刷新页面**：不能保证成功，且会丢失当前交互上下文。

采用方案 1。helper 只负责事实组合，不依赖 React，便于覆盖所有分支。

## Result Model

```ts
type InterviewSnapshotResult =
  | { status: 'error'; error: unknown }
  | {
      status: 'ready' | 'partial';
      session: InterviewSession;
      report: InterviewReport | null;
    };
```

- session loader reject：返回 `error`，不调用 report loader。
- session 不是 `report_ready`：返回 `ready` + `report: null`，不读取报告。
- session 为 `report_ready` 且报告成功：返回 `ready` + report。
- session 为 `report_ready` 但报告失败：返回 `partial` + session + `report: null`。

## Hook Behavior

- `useArchivedInterview`：`error` 才 dispatch failure；`ready/partial` 都应用 session。partial 的 notice 为“本轮复盘已生成，报告内容暂时无法读取，请刷新页面重试。”。
- `synchronizeReport`：复用 helper。partial 时写入 session、清理 stream、发送 info 通知；ready 时继续 success；error 维持现有 error。
- partial 不连接已经完成的 session。

## Report Panel

`ReportPanel` 增加 `sessionStatus`：

- 有 report：显示真实内容。
- 无 report 且 `sessionStatus === 'report_ready'`：显示“AI 复盘已生成，报告内容暂时无法读取。刷新页面可重试。”。
- 其他状态：保持现有完成引导。

视觉沿用现有 muted placeholder，不新增卡片层级、色值或动画。

## Testing

- helper：session 失败、不需报告、完整成功、报告失败 partial。
- ReportPanel：report_ready + null 显示可重试文案；空闲态保留原引导。
- 定向：helper、InterviewSidebar、interview state。
- 完整门禁：User Portal ESLint、Vitest、TypeScript、Next.js build、Prettier、`git diff --check`。

## Constraints

- 函数不超过 50 行、文件不超过 300 行、嵌套不超过 3 层、位置参数不超过 3 个、圈复杂度不超过 10。
- 不执行 commit、push 或 PR。
