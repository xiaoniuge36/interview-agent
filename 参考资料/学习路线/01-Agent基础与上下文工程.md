---
title: Agent 基础与上下文工程
date: 2026-07-29
tags: [Agent, ReAct, Context Engineering, 状态机]
kind: course
track: AI Agent 工程师完整路线
order: 1
level: foundation
duration: 75
summary: 理解 Agent 的系统边界、决策循环、停止条件和上下文预算
---

# Agent 基础与上下文工程

Agent 不是“更长的 Prompt”，而是一个允许模型在受控环境中读取状态、选择动作、观察结果并继续决策的系统。

## 学习目标

- 区分聊天、固定 Workflow 和开放 Agent。
- 能画出 Agent Loop 的状态、动作、观察和停止条件。
- 理解上下文不是聊天记录，而是一次决策所需信息的有限工作集。
- 知道 Product API、Runtime、Provider 和业务事实源应该如何分工。

## 核心心智模型

一个最小 Agent 可以写成：

```text
Goal + Current State + Allowed Tools
              ↓
        Model Decision
       ↙      ↓       ↘
  final     tool call   ask user
              ↓
     validate → execute → observe
              ↓
       update state and repeat
```

真正决定可靠性的不是箭头数量，而是五个边界：允许哪些动作、输入如何验证、状态由谁持有、何时停止、失败后写不写业务事实。

## Chat、Workflow 与 Agent

| 形态     | 决策者               | 路径           | 适用场景                             |
| -------- | -------------------- | -------------- | ------------------------------------ |
| Chat     | 模型生成文本         | 单轮或多轮对话 | 解释、改写、开放问答                 |
| Workflow | 程序                 | 预先定义       | 规则稳定、步骤可枚举、强审计任务     |
| Agent    | 模型在约束内选择动作 | 运行时变化     | 路径无法提前穷举、需要工具反馈的任务 |

能用 Workflow 解决时不要升级为 Agent。Agent 带来灵活性，也带来循环失控、工具误用、成本不可控和难以回放的问题。

## ReAct 不是打印思维链

工程上关心的是可观察的 `Action → Observation` 轨迹，而不是要求模型暴露私有推理。系统应保存工具名、结构化参数、结果摘要、错误类型和 traceId；不要把冗长内部推理当作唯一调试手段。

### 停止条件

- 模型给出满足输出 Schema 的最终结果。
- 达到最大步骤、时间或 token 预算。
- 连续重复相同工具调用。
- 工具返回不可恢复错误。
- 需要高风险动作但缺少用户确认。
- 质量门禁无法通过，进入确定性降级。

## 上下文工程

上下文窗口是一个预算，不是仓库。一次决策通常竞争以下内容：

1. 系统规则和安全边界。
2. 当前目标与用户输入。
3. 任务状态和最近观察。
4. 可用工具的必要描述。
5. 检索证据和长期记忆。
6. 输出格式与少量高价值示例。

优先级应由任务价值决定。历史消息、工具列表和检索片段都必须裁剪；“全部塞进去”会造成 Lost in the Middle、上下文污染、成本上升和错误引用。

### 常用策略

- 滑动窗口保留最近互动。
- 摘要压缩已完成阶段，但保留关键事实 ID。
- 按当前阶段动态暴露工具，而非一次注册全部工具。
- 检索只注入 top K 证据及来源，不注入整个文档。
- 把业务状态存入结构化存储，不依赖模型从对话中猜。
- 对稳定前缀使用缓存，同时给 Prompt 和工具 Schema 做版本号。

## 状态与事实源

模型输出是建议，不是事实。推荐边界：

- Web 负责展示和收集输入。
- Product API 负责身份、权限、业务事务和最终落库。
- Agent Runtime 负责编排、模型决策和结构化候选结果。
- Provider 只执行模型调用。
- 检索索引和摘要属于可重建投影，不能反向覆盖业务事实。

## 本课动手实验

不用 Agent 框架，实现一个最多运行 5 步的资料研究循环：

1. 定义 `search(query)` 和 `read(sourceId)` 两个工具 Schema。
2. 对模型动作做结构校验，未知工具直接拒绝。
3. 保存每一步的 action、observation、latency 和 errorCode。
4. 加入重复调用检测和总超时。
5. 用固定假 Provider 覆盖成功、非法参数、重复动作和超时。

完成后再用任一框架重写，列出框架替你解决的状态、checkpoint、工具注册或 tracing 问题。

## 自测

1. 用户让系统把一段文字改写成三种语气，需要 Agent 吗？为什么？
2. 为什么“最大循环次数”不能替代总超时和重复动作检测？
3. 长期记忆为什么不应该直接拼接全部历史对话？
4. Runtime 为什么不应该直接更新用户 Mastery 业务表？

参考判断：第一题用一次结构化生成即可；第二题因为单步可能挂起且不同动作可能形成逻辑空转；第三题因为相关性、隐私和预算；第四题因为业务权限、事务和幂等应由事实源负责。

## 面试怎么讲

用四层回答 Agent：模型负责不确定决策，Runtime 负责循环和状态，工具层负责受控执行，Product API 负责权限与事实。然后补充停止条件、失败降级和一条可回放 trace，回答就从概念升级为工程设计。

## 延伸来源

- [ai-agent-book](https://github.com/bojieli/ai-agent-book)：Agent、上下文工程和 Harness 的系统视角。
- [Microsoft AI Agents for Beginners](https://github.com/microsoft/ai-agents-for-beginners)：Agent 类型、设计模式和上下文课程。
- [agent-camp](https://github.com/yibo365/agent-camp)：Context Engineering、Agent Loop 与源码分析。
- [agent-study](https://github.com/Callous-0923/agent-study)：ReAct、工作流、上下文和可靠性可运行示例。
