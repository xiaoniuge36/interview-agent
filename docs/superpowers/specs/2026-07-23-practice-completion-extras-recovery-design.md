# Practice Completion Extras Recovery Design

## Problem

恢复 `report_ready` 刷题 session 时，播放器用 `Promise.all` 并行读取报告与 mastery。任一读取失败就返回 `{ report: null, mastery: [] }`，导致另一项已经成功的数据也被丢弃。最常见的后果是能力记录暂时不可用时，主报告也显示为“正在重新读取”。

## Goal

让报告和能力记录独立结算：任一项成功就立即保留，失败项单独使用空回退；未完成 session 不发起额外读取。

## Non-goals

- 不修改 API、共享契约、数据库或完成状态。
- 不自动轮询或增加重试按钮。
- 不伪造报告、分数或 mastery。
- 不改变刚提交报告时的 reconciliation 行为。

## Approach

在现有 `practice-report-reconciliation.ts` 增加 `loadPracticeCompletionExtras`：

```ts
async function loadPracticeCompletionExtras(input: {
  session: PracticeSession;
  loadReport: () => Promise<PracticeReport>;
  loadMastery: () => Promise<MasteryProfile[]>;
}): Promise<{ report: PracticeReport | null; mastery: MasteryProfile[] }>;
```

- session 非 `report_ready`：不调用 loader，返回空值。
- session 为 `report_ready`：用 `Promise.allSettled` 并行读取。
- report fulfilled 就返回报告，否则 null。
- mastery fulfilled 就返回数组，否则 `[]`。

播放器 loader 复用此 helper，删除本地严格 `loadCompletionExtras`。

## Testing

- 未完成 session 不读取。
- report 成功 / mastery 失败仍保留 report。
- report 失败 / mastery 成功仍保留 mastery。
- 两项成功全部返回；两项失败返回安全空值。
- 完整 User Portal 门禁。

## Constraints

- 函数不超过 50 行、文件不超过 300 行、嵌套不超过 3 层、位置参数不超过 3 个、圈复杂度不超过 10。
- 不执行 commit、push 或 PR。
