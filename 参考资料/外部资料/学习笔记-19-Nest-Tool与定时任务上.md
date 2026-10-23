---
title: "第19章：Nest + tool 实现 OpenClaw 同款定时任务功能（上）"
date: 2026-10-22
tags: [外部资料, NestJS, Tool, 定时任务]
kind: reference
track: 外部资料
source: ai-god-learn/学习笔记/19-Nest-Tool-定时任务上/README.md
---

# 第19章：Nest + tool 实现 OpenClaw 同款定时任务功能（上）

## 本章目标

- 用 `Nest + LangChain + tool` 搭一个可扩展的 Agent 后端骨架
- 在 `AiService` 里补齐手写 `agent loop`，支持模型自动调用工具
- 做出同步接口、SSE 流式接口，以及后续定时任务会复用的基础工具

---

## 1. 为什么 Agent 需要定时任务

不管是 OpenClaw、豆包还是各种 Copilot，定时任务本质上都在做同一件事：

1. 先把“什么时候执行”和“执行什么”拆开
2. 把时间规则持久化保存
3. 到时间后重新启动一轮 Agent Loop
4. 让这一轮 Agent 再去调用邮件、搜索、数据库等工具

也就是说，定时任务不是单独一套 AI 系统，而是“未来某个时间点再执行一次 Agent”。

---

## 2. 先搭出 Nest + Tool 的基本骨架

对应学习代码：

- `ai-agent-course-code-learn/cron-job-tool/src/app.module.ts`
- `ai-agent-course-code-learn/cron-job-tool/src/ai/ai.module.ts`
- `ai-agent-course-code-learn/cron-job-tool/src/ai/ai.service.ts`
- `ai-agent-course-code-learn/cron-job-tool/src/ai/ai.controller.ts`

### 核心思路

1. `ConfigModule` 统一管理模型配置
2. 通过 `useFactory` 创建 `ChatOpenAI` provider
3. 用 `model.bindTools([...])` 给模型挂上工具能力
4. 在 `AiService` 中手写 `while (true)` 的 agent loop
5. 一旦模型返回 `tool_calls`，就执行工具并通过 `ToolMessage` 回填上下文

### 为什么这里不能只写一次 `invoke()`

因为一旦接入 Tool，模型回答不再是“只生成文本”：

- 第 1 轮可能先决定调哪个工具
- 工具执行后还要把结果再交给模型
- 模型可能继续调用下一轮工具
- 直到没有 `tool_calls` 才能得到最终自然语言回答

所以本质上已经从“单次推理”变成了“带状态的循环推理”。

---

## 3. 流式版本的关键：`AIMessageChunk` + SSE

对应学习代码：

- `ai-agent-course-code-learn/cron-job-tool/src/ai/ai.service.ts`
- `ai-agent-course-code-learn/cron-job-tool/src/ai/ai.controller.ts`
- `ai-agent-course-code-learn/cron-job-tool/public/ai-sse-test.html`

### 流式实现的难点

流式场景拿到的不是完整 `AIMessage`，而是一个个 `AIMessageChunk`：

- 如果当前 chunk 还是普通文本，就可以直接 `yield`
- 如果出现了 `tool_call_chunks`，就要停止继续向前端推文本
- 等整轮流结束后，用 `concat()` 拼出完整消息，再进入工具调用逻辑

### 这部分的工程意义

- 用户看到的是实时输出
- 服务端保留了完整 Tool 调用闭环
- 为后面的“语音播报”“组件流式渲染”打下了统一的流式基础

---

## 4. Tool 最好做成 Provider，而不是散落函数

对应学习代码：

- `ai-agent-course-code-learn/cron-job-tool/src/ai/user.service.ts`
- `ai-agent-course-code-learn/cron-job-tool/src/tool/send-mail-tool.service.ts`
- `ai-agent-course-code-learn/cron-job-tool/src/tool/web-search-tool.service.ts`
- `ai-agent-course-code-learn/cron-job-tool/src/tool/tool.module.ts`

### 为什么要 Provider 化

如果 Tool 只是一个普通函数，它很难直接复用 Nest 的依赖注入能力。

做成 Provider 之后，Tool 内部就可以自然注入：

- `UserService`
- `MailerService`
- `ConfigService`
- 后续的 `JobService`

这样 Tool 就不只是“演示用函数”，而是能真正访问数据库、发邮件、调外部 API 的生产级能力。

### 本章先准备好的基础工具

- `query_user`：查询用户信息
- `send_mail`：发送邮件
- `web_search`：联网搜索

这三个工具后面都会被定时任务复用，所以这里其实是在先做“执行能力层”。

---

## 5. ToolModule 的意义：把“执行能力”从 AI 逻辑里拆出来

对应学习代码：

- `ai-agent-course-code-learn/cron-job-tool/src/tool/llm.service.ts`
- `ai-agent-course-code-learn/cron-job-tool/src/tool/tool.module.ts`

### 这么拆有什么好处

1. `AiService` 只关心“怎么编排对话”
2. Tool 相关 provider 统一归 `ToolModule` 管理
3. 后续 `JobAgentService` 可以直接复用这些工具，而不是重复定义一套

这一步非常关键，因为下篇的定时任务执行，本质上也是“另一套使用同样工具的 Agent”。

---

## 6. 本章关键收获

### 架构层面

- 定时任务不是独立能力，而是“未来重新执行 Agent Loop”
- Tool 要尽早做成 Provider，方便注入 service 和外部依赖
- 流式接口和同步接口最好共用同一套工具与上下文结构

### 工程层面

- SSE 适合流式文本
- `AIMessageChunk.concat()` 是流式 Tool 调用的关键
- 邮件、搜索这类工具要先标准化，定时任务才能真正复用

### 对应代码入口

- `ai-agent-course-code-learn/cron-job-tool/`

### Demo 页面

启动后端后访问：

```bash
cd ai-agent-course-code-learn/cron-job-tool
npm run start:dev
# → http://localhost:3000/ai-sse-test.html   (SSE 流式对话测试，支持同步/流式切换)
# → http://localhost:3000/cron-job-demo.html  (定时任务管理 Demo，对话 + 任务列表)
```

