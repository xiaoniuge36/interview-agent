---
title: "第23章：图编排引擎 LangGraph 和多 Agent 架构"
date: 2026-10-22
tags: [外部资料, LangGraph, 多Agent, 编排]
kind: reference
track: 外部资料
source: ai-god-learn/学习笔记/23-LangGraph和多Agent架构/README.md
---

# 第23章：图编排引擎 LangGraph 和多 Agent 架构

## 本章目标

- 理解为什么复杂 Agent 产品通常会走向多 Agent 架构
- 掌握 LangGraph 里的 `state / node / edge / checkpoint / interrupt`
- 看懂 `ToolNode`、`createAgent`、`createSupervisor` 这几层封装之间的关系

---

## 1. 为什么复杂 Agent 往往要升级成多 Agent

单 Agent 当然也能做很多事，但当 Tool、Prompt、角色职责越来越多时，会遇到三个典型问题：

- 一个 system prompt 里塞太多规则，容易让上下文变脏，推理成本变高
- 所有任务都由一个“大脑”串行处理，吞吐和响应速度受限
- 自我反思式纠错能力有限，缺少角色分工带来的交叉校验

所以多 Agent 常见的价值就是：

- `Prompt 更纯`：每个 Agent 只保留自己需要的那部分能力描述
- `任务可并行`：主管拆任务，多个 Worker 可以分别处理
- `角色可纠错`：天气、搜索、规划、执行各司其职，比一个 Agent 全包更稳

---

## 2. LangGraph 的核心抽象

LangGraph 本质上是在 LangChain 之上补了一层“图编排”能力。

### 最核心的 4 个概念

1. `State`
   - 图里每个节点共享的状态对象
   - 常用 `Annotation.Root()` 定义字段、默认值和合并逻辑
2. `Node`
   - 图里的一个处理步骤，本质上就是一个函数
   - 输入当前 state，输出新的 state 增量
3. `Edge`
   - 节点之间的连线，决定流程怎么走
   - 可以是固定边，也可以是条件边
4. `Graph`
   - 用 `new StateGraph(...)` 创建
   - 最后通过 `compile()` 编译成可执行对象

### `Annotation` 为什么重要

`Annotation` 不只是定义字段类型，更重要的是定义：

- `default`：字段初始值是什么
- `reducer`：多个节点更新同一字段时，怎么合并

这也是 LangGraph 能做“多节点共享状态”的基础。

---

## 3. 图编排最基础的三种形态

对应学习代码目录：

- `ai-agent-course-code/langgraph-test/src/basic-graph.mjs`
- `ai-agent-course-code/langgraph-test/src/conditional-routing.mjs`
- `ai-agent-course-code/langgraph-test/src/loop-retry.mjs`

### 3.1 线性图：固定顺序执行

`basic-graph.mjs` 演示的是最简单的链路：

```text
START -> step1 -> step2 -> END
```

适合理解：

- `StateGraph` 怎么创建
- `addNode()` / `addEdge()` 怎么使用
- `START` / `END` 是什么

### 3.2 条件路由：根据 state 走不同分支

`conditional-routing.mjs` 用 `addConditionalEdges()` 做了一个“聊天 / 计算器”二选一路由：

- 如果输入里出现 `+ - * /`，走 `math`
- 否则走 `chat`

它说明了一件事：LangGraph 不是只能顺序执行，它天然适合有分支的工作流。

### 3.3 循环重试：图不是链，而是状态机

`loop-retry.mjs` 把“失败就继续重试，成功才结束”写成：

```text
START -> attempt
attempt --retry--> attempt
attempt --done--> END
```

这也是 LangGraph 相比 LCEL 更重要的差异点：

- LCEL 更擅长线性声明式组合
- LangGraph 更擅长状态机、循环、复杂路由

---

## 4. 持久化执行状态：Checkpoint

对应学习代码：

- `ai-agent-course-code/langgraph-test/src/checkpointer-memory.mjs`
- `ai-agent-course-code/langgraph-test/src/checkpointer-sqlite.mjs`

图在执行过程中，状态是可以保存下来的。

### 常见用途

- 多轮会话恢复
- 长任务断点续跑
- 人工确认后继续执行
- 崩溃恢复 / 审计追踪

### 本章里的两种方式

- `MemorySaver`：保存到内存，适合 demo
- `SqliteSaver`：保存到 SQLite，更接近真实持久化

关键理解：

- `thread_id` 决定的是“这是哪一条执行链 / 会话”
- 同一个 `thread_id` 再次调用时，会从上次 state 继续

---

## 5. 人工介入：Interrupt / Resume

对应学习代码：

- `ai-agent-course-code/langgraph-test/src/graph-interrupt.mjs`

这段代码和很多 Coding Agent 的“请确认后继续执行”非常像。

### 核心机制

1. 节点里调用 `interrupt(...)`
2. 图会暂停，把当前断点保存下来
3. 用户输入确认信息
4. 再次 `invoke(new Command({ resume }))`
5. 图从上次断点继续执行

### 这类能力很适合

- 转账 / 删除 / 批量修改等高风险动作
- 需要人工补充参数的工作流
- 半自动 Agent 流程

---

## 6. Prebuilt：常见 Agent Loop 已经帮你封装好了

对应学习代码：

- `ai-agent-course-code/langgraph-test/src/prebuilt-tool-node.mjs`
- `ai-agent-course-code/langgraph-test/src/prebuilt-agent.mjs`

### 手写图版的 Tool 调用

如果自己写 Agent Loop，通常要有：

- 一个 LLM 节点
- 一个 Tool 节点
- 一条条件边：有 `tool_calls` 就去工具节点，没有就结束

LangGraph 已经把这里面最常见的部分封成了：

- `ToolNode`
- `toolsCondition`

### 再往上一层：`createAgent`

`createAgent()` 其实就是把常见 Agent Loop 图进一步封装掉了。

所以可以把这三层理解成：

```text
手写 StateGraph
  -> ToolNode + toolsCondition
  -> createAgent
```

抽象越来越高，但底层思想没有变。

---

## 7. 多 Agent 最常见的模式：Supervisor - Worker

对应学习代码：

- `ai-agent-course-code/langgraph-test/src/multi-agent-supervisor.mjs`
- `ai-agent-course-code/langgraph-test/src/simple-mock.mjs`

### 这一章的例子

- `weather_agent`：只负责天气
- `trivia_agent`：只负责城市小知识
- `supervisor`：负责判断当前问题交给谁

### 这套模式的关键价值

- `Supervisor` 只做调度，不做领域回答
- `Worker` 各自专注自己的能力边界
- 复杂任务可以拆分成多个专业角色

### `streamMode` 的两个常用观察方式

- `updates`：看每个节点增量改了什么
- `values`：看当前完整 state

这对于调试多 Agent 非常有帮助。

---

## 8. 本章和前面章节的关系

### 和 Runnable / LCEL 的关系

- LCEL 适合线性组合和声明式链路
- LangGraph 适合复杂状态流转、循环、分支、多节点协作

### 和前面 Agent 工程化章节的关系

- 第19-22章更多是在做 Agent 产品化能力
- 第23章开始补“复杂 Agent 如何编排”的底层方法

也就是说，第23章补的是：

```text
从单链路 Agent
  -> 带状态的图编排
  -> 带角色分工的多 Agent
```

---

## 9. 本章关键收获

### 架构层面

- LangGraph 是 LangChain 编排层里处理复杂流程的关键工具
- 多 Agent 本质上是“角色拆分 + 状态传递 + 主管调度”
- `createAgent` 和 `createSupervisor` 背后仍然是图

### 工程层面

- `Annotation` 决定 state 字段的默认值和合并策略
- `addConditionalEdges()` 同时能表达分支和循环
- `checkpointer + interrupt` 能把 Agent 变成可暂停、可恢复的系统

### 对应代码入口

- `ai-agent-course-code/langgraph-test/`

### 快速运行

```bash
cd ai-agent-course-code/langgraph-test
npm install

# 基础图 / 分支 / 循环
npm run basic
npm run route
npm run loop

# 状态保存与中断恢复
npm run checkpoint:memory
npm run checkpoint:sqlite
npm run interrupt

# prebuilt 与多 Agent
npm run prebuilt:tool-node
npm run prebuilt:agent
npm run multi-agent
```

### 对应学习 demo

统一学习入口：

```bash
cd ai-agent-course-code-learn/learning-demo
npm start
# -> http://localhost:3456
```

然后进入 `🕸️ LangGraph / 多 Agent` 面板。
