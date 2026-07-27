# 刷题完成页下一步动作设计

**日期：** 2026-07-23  
**状态：** 已批准，可实施

## 目标

把 AI 复盘中的薄弱题直接转成下一轮行动。完成页只有一个主动作：本轮存在低于 60 分的题时显示“复练薄弱项”，否则保持“按最新推荐开始下一轮”。

## 行为

- 仅在 `report_ready` 且报告已加载时判断本轮是否有薄弱题。
- `itemEvaluations` 任一分数低于 60 时，主动作创建 `weakness_review` 会话。
- 没有低于 60 分的题时，继续使用现有岗位/画像推荐题单。
- 创建中按钮保持禁用；创建失败恢复并显示现有通知；创建成功保持禁用直到路由切换。
- “开始新的题单”和“返回题库大厅”仍为次级出口。

## 结构

- 将 `createWeaknessReviewSession`、防重复工作流和 `hasReviewableWeakness` 移到 `apps/user-portal/src/lib/weakness-review.ts`，训练档案与完成页共同使用。
- `usePracticePlayer` 新增弱项复练动作与独立 busy 状态。
- `PracticeCompletionPanel` 根据报告选择唯一主动作，不复制 API 调用逻辑。

## 边界

- 60 分阈值与 Product API 当前弱项筛选一致。
- 前端判断只决定按钮文案和动作；服务端仍是最终选题与权限事实源。
- 不修改共享契约、Prisma schema、迁移、根配置或依赖。

## 验证

- helper：请求参数、成功保持锁定、失败恢复、分数阈值。
- 完成页：有弱项显示复练动作；无弱项显示最新推荐；两者不同时出现。
- 用户端完整 Vitest、ESLint、TypeScript、Next.js build、Prettier 和 `git diff --check`。
