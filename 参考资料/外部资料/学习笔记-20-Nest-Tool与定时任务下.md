---
title: "第20章：Nest + tool 实现 OpenClaw 同款定时任务功能（下）"
date: 2026-10-22
tags: [外部资料, NestJS, Tool, 定时任务]
kind: reference
track: 外部资料
source: ai-god-learn/学习笔记/20-Nest-Tool-定时任务下/README.md
---

# 第20章：Nest + tool 实现 OpenClaw 同款定时任务功能（下）

## 本章目标

- 用 `TypeORM` 把用户 CRUD 和定时任务都做成可持久化能力
- 实现 `cron / every / at` 三类任务
- 到时间后启动专用 `JobAgentService`，真正执行指令文本

---

## 1. 先把数据库 CRUD 做成 Tool

对应学习代码：

- `ai-agent-course-code-learn/cron-job-tool/src/users/entities/user.entity.ts`
- `ai-agent-course-code-learn/cron-job-tool/src/users/users.service.ts`
- `ai-agent-course-code-learn/cron-job-tool/src/tool/db-users-crud-tool.service.ts`

### 这一层做了什么

1. 用 `User` entity 映射数据库表
2. 用 `UsersService` 通过 `EntityManager` 完成增删改查
3. 再把这些 CRUD 操作封装成 `db_users_crud` tool

### 为什么要这么做

因为 Agent 真正有价值的地方，不是“会说”，而是“能改业务状态”：

- 查用户
- 新增用户
- 更新用户
- 删除用户

把数据库操作放到 Tool 之后，Agent 才开始具备真正的业务执行能力。

---

## 2. 定时任务的核心模型：Job 表

对应学习代码：

- `ai-agent-course-code-learn/cron-job-tool/src/job/entities/job.entity.ts`

### `Job` 实体里最关键的字段

- `instruction`：真正要执行的自然语言任务
- `type`：`cron | every | at`
- `cron`：Cron 表达式
- `everyMs`：固定间隔毫秒
- `at`：某个具体时间点
- `isEnabled`：任务开关
- `lastRun`：最近一次执行时间

### 为什么必须持久化

`SchedulerRegistry` 只能管理当前进程内的运行时任务，服务重启就没了。

所以真正可管理的定时任务系统，必须做到：

1. 配置存数据库
2. 应用启动后自动恢复
3. 支持列表、启停、删除、查看上次执行时间

这也是为什么豆包和 OpenClaw 都会有“任务列表”的 UI。

---

## 3. 三种任务类型的职责划分

对应学习代码：

- `ai-agent-course-code-learn/cron-job-tool/src/job/job.service.ts`

### `cron`

- 适合已经明确给出 Cron 表达式的场景
- 本质是“按表达式循环执行”

### `every`

- 适合“每 5 分钟”“每小时”这种固定间隔任务
- 本质是 `setInterval`

### `at`

- 适合“10 分钟后”“明天 9 点”这种一次性任务
- 本质是 `setTimeout`
- 执行一次后自动停用

### 为什么要分三类

因为用户自然语言里的时间语义本来就不是一种：

- “1 分钟后提醒我喝水”是一次性
- “每 1 小时同步一次数据”是周期性
- “用 `*/5 * * * * *` 跑任务”是明确的 cron 表达式

拆成三种类型后，提示词和工具 schema 才能表达清楚。

---

## 4. `JobService` 负责“持久化 + 运行时注册”

对应学习代码：

- `ai-agent-course-code-learn/cron-job-tool/src/job/job.service.ts`

### 关键职责

1. `onApplicationBootstrap()`：服务重启后恢复已启用任务
2. `listJobs()`：查看数据库任务及运行状态
3. `addJob()`：新增任务并立即注册到运行时
4. `toggleJob()`：开启或停用任务
5. `startRuntime()` / `stopRuntime()`：把数据库任务映射到 `CronJob / setInterval / setTimeout`

### 这一步的本质

数据库里的 `Job` 是“配置真相”，`SchedulerRegistry` 是“进程内执行器”。

两者结合之后，定时任务才同时具备：

- 可恢复
- 可管理
- 可执行

---

## 5. `cron_job` tool 的关键不是时间，而是“拆句子”

对应学习代码：

- `ai-agent-course-code-learn/cron-job-tool/src/tool/cron-job-tool.service.ts`
- `ai-agent-course-code-learn/cron-job-tool/src/ai/ai.service.ts`

### 模型在创建任务时必须做两件事

1. 从用户话里识别“什么时候执行”
2. 把真正要做的事提取成 `instruction`

比如：

- 用户说：`1 分钟后提醒我喝水`
- `at` 是未来 1 分钟后的时间点
- `instruction` 只能是：`提醒我喝水`

### 为什么 `instruction` 必须保留自然语言

因为未来到点后，真正执行它的是另一轮 Agent。

所以 `instruction` 应该是一段“可再理解的任务描述”，而不是：

- 某个函数调用
- 一段脚本
- 某种提前写死的实现细节

这点决定了定时任务系统能不能保持通用性。

---

## 6. 到时间后为什么还要再跑一个 `JobAgentService`

对应学习代码：

- `ai-agent-course-code-learn/cron-job-tool/src/ai/job-agent.service.ts`
- `ai-agent-course-code-learn/cron-job-tool/src/tool/tool.module.ts`

### 原因很简单

定时任务执行时，系统拿到的只有一段 `instruction`，比如：

- `把今天的 AI 新闻搜索后发我邮箱`
- `把用户列表导出来并发通知`

这段文本仍然需要模型重新理解、规划，并决定调用哪些工具。

所以到点执行不是“直接写死逻辑”，而是：

1. 启动一个专用后台 Agent
2. 绑定允许使用的工具
3. 再跑一轮 agent loop
4. 得出最终执行结果

### 为什么禁止定时任务里再创建定时任务

`JobAgentService` 只绑定邮件、搜索、数据库、时间等执行型工具，不绑定 `cron_job` 本身。

这样可以避免：

- 任务递归创建任务
- 系统进入无限自我扩张
- 运维和审计失控

---

## 7. `time_now` tool 为什么必要

对应学习代码：

- `ai-agent-course-code-learn/cron-job-tool/src/tool/time-now-tool.service.ts`

如果用户说的是：

- `10 分钟后提醒我开会`
- `今晚 8 点给我发日报`

模型要把这些自然语言转换成具体 `at` 时间，就必须知道“当前时间”。

所以时间本身也要做成 Tool，而不是靠模型“猜现在几点”。

---

## 8. 本章关键收获

### 架构层面

- 定时任务系统 = 持久化配置 + 运行时调度 + 到点后二次 Agent 执行
- `instruction` 保存的是任务语义，而不是工具实现
- `ToolModule` 让普通对话 Agent 和后台 Job Agent 共用执行能力

### 工程层面

- `cron / every / at` 三类任务各自语义清晰
- `SchedulerRegistry` 解决运行时调度，数据库解决重启恢复
- `time_now` 这类看似简单的工具，在时间解析场景里非常关键

### 对应代码入口

- `ai-agent-course-code-learn/cron-job-tool/`

### Demo 页面

启动后端后访问：

```bash
cd ai-agent-course-code-learn/cron-job-tool
npm run start:dev
# → http://localhost:3000/cron-job-demo.html  (定时任务管理 Demo，对话创建 + 任务列表 + 启停切换)
# → http://localhost:3000/ai-sse-test.html   (SSE 流式对话测试)
```

