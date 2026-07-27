# 弱项复练闭环设计

**日期：** 2026-07-23  
**状态：** 已批准，可实施  
**范围：** 训练档案、刷题会话创建、历史低分题选取

## 目标

让用户从训练档案一键创建“弱项复练”会话。系统只使用当前租户、当前用户最新评价仍低于弱项阈值且仍可训练的题目，按当前得分从低到高组题，创建后直接进入刷题播放器。

## 方案选择

采用服务端选题方案：前端只表达 `mode: weakness_review`，Product API 负责历史证据查询、权限边界、去重和题目状态过滤。

未采用以下方案：

- 前端读取单次会话并提交 `questionIds`：会把选题策略和权限判断泄漏到 UI，也无法综合多轮历史。
- 新增复习任务与间隔调度表：需要 Prisma schema 和迁移，适合作为后续独立迭代。

## 用户体验

训练档案的训练概览区增加主操作“复练薄弱项”。点击后：

1. 按钮进入“正在组题…”状态并禁止重复提交。
2. 前端调用现有 `POST /practices`，请求体为 `{ title: '薄弱项复练', mode: 'weakness_review' }`。
3. 创建成功后显示成功通知并跳转到 `/practice?session=<id>`。
4. 若没有历史低分题，显示明确提示，保留当前训练档案，不进行空跳转。

不增加弹窗和配置项；一次点击即可进入下一轮训练。

## 后端选题

新增独立选择函数，职责是从 `EvaluationResult -> PracticeSessionItem -> PracticeSession / Question` 链路读取证据：

- 限定 `tenantId` 和 `session.userId`，阻止跨租户或跨用户读取。
- 只选择 `published` 且对当前租户仍可见的题目。
- 按评价时间倒序读取候选，同一道题只保留最新一次评价。
- 只保留最新得分低于 60 分的题目，再按当前得分升序排列。
- 最多返回 5 道题；至少 1 道即可创建复练会话。
- 没有可用题时返回 `400 PRACTICE_WEAKNESSES_UNAVAILABLE`，消息为“还没有可复练的薄弱项，请先完成一轮 AI 评价。”。

手选 `questionIds` 的现有行为优先级保持不变；只有未传 `questionIds` 且 `mode === 'weakness_review'` 时启用历史选题。`smart` 和 `manual` 模式不变。

## 文件边界

- `apps/product-api/src/modules/practice/practice-weakness-selector.ts`：查询、排序、去重、截断。
- `apps/product-api/src/modules/practice/practice-weakness-selector.spec.ts`：租户/用户范围、可见性、低分优先和去重测试。
- `apps/product-api/src/modules/practice/practice-command.service.ts`：仅负责按模式路由选择器并处理空结果。
- `apps/user-portal/src/components/reports/WeaknessReviewAction.tsx`：按钮状态、创建请求、通知和跳转。
- `apps/user-portal/src/components/reports/WeaknessReviewAction.test.tsx`：请求参数与按钮状态测试。
- `apps/user-portal/src/components/reports/ReportsPageContent.tsx`：在训练概览中挂载动作，不承担业务逻辑。

## 错误与并发

- 前端用本地 `starting` 状态防止重复点击；服务端仍把每次创建视为独立会话，不引入跨请求幂等状态。
- 题目在历史评价后被停用或归档时不会进入新会话。
- API 或网络失败时恢复按钮状态，并通过现有通知系统显示服务端消息与请求编号。
- 不修改已有历史记录、评价、报告或掌握度。

## 验证

- 后端单元测试：查询范围、最新评价覆盖旧评价、当前分数排序、题目可见性、重复题去重、5 题上限、空结果错误。
- 前端单元测试：使用 `weakness_review` 请求创建；按钮默认/忙碌状态和文案。
- 定向门禁：Product API Jest、用户端 Vitest、两端 ESLint、TypeScript、Prettier、`git diff --check`。
- 回归门禁：两端完整测试与生产构建；构建和类型检查串行执行，避免 Next `.next/types` 竞态。

## 后续迭代

间隔复习日期、遗忘曲线、题目级复习次数和提醒属于后续独立能力，需要先确认共享契约与持久化变更。本轮不预埋字段。
