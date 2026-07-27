# Home Training Continuation Design

## Problem

新版首页以题库和训练推荐为主，并能恢复最近一轮未完成刷题，但不会显示仍在进行的模拟面试。用户从其他页面回到首页后，可能被“开始新训练”吸引而遗漏更应该先完成的会话。

## Goal

把首页现有“继续上次练习”升级为统一的“最近未完成训练”卡片：在未完成刷题和活动模拟面试之间选择更新时间最新的一项，并直接恢复到对应 session。

## Non-goals

- 不修改 Product API、共享契约、数据库或排序语义。
- 不同时堆叠多张恢复卡，不建设完整任务中心。
- 不把未真正进入运行、已完成、失败或取消的模拟面试当作待继续训练。
- 不改变 Agent 推荐题单的优先级与创建行为。

## Approach Decision

1. **前端聚合现有查询（采用）**：并行读取 `/practices/recent` 与现有 `listInterviews()`，用纯模型选择最近活动项。
2. **只补模拟面试卡**：实现最少，但当刷题与面试同时未完成时会产生两个竞争入口。
3. **新增统一后端 endpoint**：长期接口更整洁，但需要共享契约和后端变更，超出当前授权边界。

采用方案 1。两个现有读取接口已经提供所需事实，前端聚合能在不扩大系统边界的前提下修复首页连续性。

## Selection Rules

- 刷题候选由 `getRecentPractice()` 提供，API 已限制为 `created` / `in_progress`。
- 模拟面试仅接受 `running`、`waiting_user`、`generating_report`；`created` 在当前恢复链路不会重新连接流，因此不能作为“继续模拟”入口。
- 每类先取 `updatedAt` 最新项，再在两类之间比较；时间相同时保持首页的刷题主轴，优先刷题。
- 某一查询失败时继续使用另一查询；两者都不可用时不渲染恢复卡，也不阻塞题库和推荐。
- 链接必须携带 session id：`/practice?session=<id>` 或 `/interview?session=<id>`。

## Normalized View Model

```ts
type TrainingContinuation = {
  kind: 'practice' | 'interview';
  id: string;
  title: string;
  updatedAt: string;
  href: string;
  kicker: string;
  detail: string;
  actionLabel: string;
  progressPercent: number | null;
  statusLabel: string | null;
};
```

组件只消费标准化模型，不自行判断业务状态。

## Visual Direction

- **Subject / audience / job:** 正在准备求职面试的候选人；卡片唯一任务是把人带回最近被打断的训练现场。
- **Palette:** 完全继承现有 `--primary`、`--success`、`--surface`、`--outline`，不引入孤立色值。
- **Type:** 继承现有标题、正文和 utility 字号；状态文案保持短促、可扫描。
- **Layout:** 保留现有三列 continuation strip：训练说明 / 进度或现场状态 / 唯一动作；移动端继续折为单列。
- **Signature:** 中间列随训练类型变化。刷题显示真实回答进度条；模拟面试显示带状态点的“现场状态轨”，明确这是可继续的活跃会话，而不是普通历史记录。
- 不新增循环动画；现有页面已经有 Agent 状态动效，此处以静态状态点保持克制。

## Copy

- 刷题：`继续上次练习`、`已回答 x/y 题，进度已保留。`、`继续练习`。
- 模拟面试：`继续上次模拟`、`停在<阶段>，已完成 n 轮回答。`、`继续模拟`。
- 模拟状态轨：等待用户时显示 `等待你的回答`；生成追问时显示 `面试官准备中`；生成报告时显示 `复盘生成中`。

## Testing

- 模型：过滤非活动面试、选择每类最新项、跨类型按时间选择、同时间优先刷题、局部查询为空。
- 组件：刷题显示进度条和 session 链接；面试显示现场状态轨和 session 链接。
- 数据 hook：使用两个现有 API，分别降级为空值。
- 完整门禁：User Portal ESLint、Vitest、TypeScript、Next.js build、Prettier、`git diff --check`。

## Constraints

- 函数不超过 50 行、文件不超过 300 行、嵌套不超过 3 层、位置参数不超过 3 个、圈复杂度不超过 10。
- 不执行 commit、push 或 PR。
