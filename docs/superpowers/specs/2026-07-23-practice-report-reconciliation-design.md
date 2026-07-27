# Practice Report Reconciliation Design

## Problem

刷题播放器提交 AI 复盘时先调用 `submitPracticeSession`，成功后再并行读取最新 session 与 mastery。当前使用单个 `try` + `Promise.all`：只要任一后续读取失败，界面就把已经生成的报告误报为“AI 复盘生成失败”，用户可能重复提交已成功的命令。

## Goal

区分主命令失败与成功后的同步失败：报告成功返回后始终进入完成态；session 或 mastery 暂时读取失败时保留已取得结果、使用安全回退，并明确提示部分信息会在刷新后继续同步。

## Non-goals

- 不修改 Product API、幂等策略、共享契约、数据库或报告生成流程。
- 不增加自动轮询、后台重试队列或跨页面缓存。
- 不删除未使用的旧 `usePracticeController`。
- 不把真正的 `submitPracticeSession` 失败降级为成功。

## Approach Decision

1. **主命令 + 容错对账 helper（采用）**：先 await 主命令，再用 `Promise.allSettled` 拉取 session/mastery，返回标准化对账结果。
2. **把两次读取分别 catch 在 hook 内**：改动较少，但异步语义继续散落在 UI hook，难以直接回归测试。
3. **主命令成功后强制整页刷新**：状态最终一致，但体验中断且无法利用已经返回的报告。

采用方案 1。helper 将“哪些失败会否定主结果”变成可测试的明确边界。

## Result Model

```ts
type PracticeReportReconciliation = {
  report: PracticeReport;
  session: PracticeSession;
  mastery: MasteryProfile[] | null;
  synchronizationComplete: boolean;
};
```

输入包含当前 session 与四个依赖函数：提交报告、读取 session、读取 mastery。helper 行为：

1. `submitReport()` 失败时原样 reject，且不启动后续读取。
2. 主命令成功后并行执行两个读取，并等待两者 settled。
3. session 读取失败时，以当前 session 克隆并把 status 设为 `report_ready`；报告已经返回，因此界面可以安全进入完成页。
4. mastery 读取失败时返回 `null`，hook 保留当前 mastery。
5. 两个读取都成功时 `synchronizationComplete = true`，否则为 false。

## UI Behavior

- 完全同步：保持“AI 复盘已生成，评分与能力记录已同步完成。”。
- 部分同步：完成页展示已返回报告；页面 message 为“AI 复盘已生成，部分训练状态将在刷新后继续同步。”；发送 info 通知，不显示失败通知。
- 主命令失败：保持现有 `setActionError(..., 'AI 复盘生成失败')`。
- 主命令成功后清除本轮本地草稿状态，无论后续读取是否完整。

## Testing

- 主命令失败：helper reject，session/mastery loader 未调用。
- 完全成功：返回服务端最新 session、mastery 和 complete 状态。
- session 读取失败：返回本地 `report_ready` session，保留报告。
- mastery 读取失败：返回 `null` mastery，保留报告与最新 session。
- 两个读取失败：仍返回报告与完成态，标记同步未完成。
- 完整门禁：User Portal ESLint、Vitest、TypeScript、Next.js build、Prettier、`git diff --check`。

## Constraints

- 函数不超过 50 行、文件不超过 300 行、嵌套不超过 3 层、位置参数不超过 3 个、圈复杂度不超过 10。
- 不执行 commit、push 或 PR。
