---
title: Memory、Planning 与 Multi-Agent
date: 2026-07-29
tags: [Memory, Planning, Workflow, Multi-Agent, Checkpoint]
kind: course
track: AI Agent 工程师完整路线
order: 4
level: intermediate
duration: 110
summary: 用分层记忆、显式状态和可恢复编排控制复杂 Agent，而不是无限增加自主性
---

# Memory、Planning 与 Multi-Agent

记忆、规划和多 Agent 都会增加系统能力，也会放大错误传播、状态不一致和成本。正确顺序是先把单 Agent 的状态与工具边界做清楚，再根据任务证据逐级增加复杂度。

## 学习目标

- 区分上下文、会话状态、长期记忆和业务事实源。
- 掌握 Routing、ReAct、Plan-and-Execute、Reflection 等编排模式的边界。
- 判断何时需要 Multi-Agent，并设计明确的通信与交接契约。
- 用 Checkpoint、幂等和事件记录让长任务可暂停、恢复与回放。

## Memory 不是聊天记录仓库

| 层次              | 保存什么                       | 典型生命周期   | 读取方式               |
| ----------------- | ------------------------------ | -------------- | ---------------------- |
| Working Memory    | 当前步骤、临时变量、最近观察   | 一次运行       | 直接随状态传递         |
| Session Memory    | 本轮目标、已确认约束、阶段摘要 | 一次会话       | 会话 ID + 最近窗口     |
| Episodic Memory   | 发生过的事件及结果             | 跨会话         | 时间、实体或相似度检索 |
| Semantic Memory   | 经验证的用户偏好、领域事实     | 长期           | 结构化查询或检索       |
| Procedural Memory | 可复用的规则、Skill 和操作流程 | 版本化长期保存 | 按任务动态加载         |

用户档案和订单状态等业务事实仍由 Product API 管理。Memory 是帮助决策的可重建投影，不能用模型总结静默覆盖事实源。

### 记忆写入管线

```text
候选事件 → 隐私/权限检查 → 去重与冲突检测 → 置信度/来源
        → 用户确认（必要时） → 版本化存储 → 可删除与可追溯
```

不要每轮都写长期记忆。只有对后续任务有稳定价值、来源明确、允许保存的内容才进入长期层。读取时同时考虑相关性、新鲜度、置信度和权限，并限制注入预算。

## 选择编排模式

| 模式                   | 适用条件                   | 主要风险             |
| ---------------------- | -------------------------- | -------------------- |
| Deterministic Workflow | 路径稳定、审计要求高       | 分支膨胀             |
| Router                 | 输入可分类到少量处理器     | 误路由、类别漂移     |
| ReAct                  | 下一步依赖工具观察         | 空转、重复调用       |
| Plan-and-Execute       | 长任务可拆解且步骤存在依赖 | 计划过时、错误累积   |
| Reflection             | 有明确质量标准且可再次尝试 | 自我肯定、成本翻倍   |
| Evaluator-Optimizer    | 产物可被独立 rubric 评价   | Judge 偏差、循环不止 |

规划不是先生成一段漂亮清单。可执行计划必须包含步骤 ID、依赖、输入、完成条件、预算和失败策略；每次观察改变前提时只重规划受影响部分。

## 什么时候需要 Multi-Agent

只有出现以下证据时才拆分：角色需要不同工具或权限、上下文天然隔离、任务可并行、需要独立评价者，或者单 Agent 的工具与指令已难以治理。

不要为了“像团队”而拆分。多个角色共享同一模型、同一上下文和同一工具时，通常只是更贵的 Prompt 链。

### 常见拓扑

- Supervisor：统一分配任务和合并结果，边界清晰但存在中心瓶颈。
- Orchestrator-Worker：动态拆分并并行执行，适合可独立验证的子任务。
- Pipeline：角色按固定顺序交接，易审计但反馈回路较慢。
- Peer/Handoff：Agent 根据能力直接转交，灵活但容易形成环路。

每次交接至少携带 `taskId`、目标、输入引用、已完成证据、未决问题、预算和返回 Schema。不要传完整聊天记录，更不要依赖自然语言猜测谁负责下一步。

## 可恢复状态机

状态至少区分 `pending`、`running`、`waiting_for_user`、`succeeded`、`failed` 和 `cancelled`。在产生外部副作用前保存 Checkpoint；恢复时用幂等键判断动作是否已执行，而不是从最后一条消息重新猜。

长任务还需要：最大并发、任务租约、心跳、取消信号、补偿动作、死信队列和人工接管点。事件日志用于回放，当前状态用于高效查询，两者职责不同。

## 本课动手实验

实现一个“研究—写作—审校”任务，但先用单进程显式状态机完成：

1. Planner 生成带依赖和完成条件的三步计划。
2. Researcher 只能访问只读检索工具，Writer 只能写草稿。
3. Reviewer 使用固定 rubric，最多退回一次。
4. 每步保存输入引用、结果摘要、状态、尝试次数和 Checkpoint。
5. 在写作完成后主动终止进程，再恢复并验证不会重复检索或写入。
6. 比较单 Agent 与三角色版本的成功率、总调用数、延迟和调试成本。

若 Multi-Agent 没有显著改善隔离、并行或质量，就保留单 Agent Workflow。

## 自测

1. 长期记忆为什么不能直接保存模型对用户的所有推断？
2. Plan-and-Execute 在什么情况下反而不如 ReAct？
3. Reviewer Agent 为什么不能替代确定性 Schema 和业务校验？
4. Agent 恢复后怎样证明一个写操作不会执行两次？

## 面试怎么讲

先给复杂度阶梯：Workflow → Router → 单 Agent → 带规划 Agent → Multi-Agent。说明每次升级对应的证据，再用一次恢复实验讲清状态、Checkpoint、幂等和交接契约。这样的回答比罗列框架更能体现架构判断。

## 延伸来源

- [ai-handbook](https://github.com/nageoffer/ai-handbook)：窗口、摘要、长期记忆、Plan-and-Execute、Reflection 与主从式 Multi-Agent。
- [Microsoft AI Agents for Beginners](https://github.com/microsoft/ai-agents-for-beginners)：Planning、Multi-Agent、Context 与 Memory 专题。
- [agent-study](https://github.com/Callous-0923/agent-study)：工作流模式、MemGPT/Letta、A2A 和可恢复状态示例。
- [ai-agent-book](https://github.com/bojieli/ai-agent-book)：记忆系统、Harness、规划和持续进化的系统边界。
