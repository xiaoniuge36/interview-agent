---
title: "第22章：AGUI 协议：Vercel AI SDK + LangChain 实现流式组件渲染"
date: 2026-10-22
tags: [外部资料, AGUI, 流式, 协议]
kind: reference
track: 外部资料
source: ai-god-learn/学习笔记/22-AGUI协议/README.md
---

# 第22章：AGUI 协议：Vercel AI SDK + LangChain 实现流式组件渲染

## 本章目标

- 解决“只有流式文本，没有组件状态”的前端体验问题
- 用 Vercel AI SDK 的 `Data Stream Protocol` 承载 AGUI 事件
- 让 LangChain Agent 的流式输出，变成前端可渲染的文本块和 Tool 组件

---

## 1. 为什么纯文本 SSE 不够用

如果后端只返回：

- 一段段文字 chunk

那前端根本不知道当前发生了什么：

- 是普通文本？
- 是工具参数正在生成？
- 是工具调用完成了？
- 还是工具报错了？

要做像 Cursor、豆包、ChatGPT 那样的“边输出边渲染工具卡片”，必须让流里带上结构化事件。

---

## 2. AGUI / Data Stream Protocol 解决的就是“事件语义”

### 常见事件类型

- `text-start / text-delta / text-end`
- `tool-input-start / tool-input-delta / tool-input-available`
- `tool-output-available`

这些事件让前端可以把同一条 SSE 流拆成不同 UI：

- 普通文本区域
- Tool 调用参数面板
- Tool 输出卡片
- Pending / Error / Success 状态

---

## 3. 后端：LangChain 负责 Agent，AI SDK 负责协议适配

对应学习代码：

- `ai-agent-course-code-learn/agui-backend/src/ai/ai.module.ts`
- `ai-agent-course-code-learn/agui-backend/src/ai/ai.service.ts`
- `ai-agent-course-code-learn/agui-backend/src/ai/ai.controller.ts`

### 核心链路

1. `createAgent()` 创建 LangChain Agent
2. `toBaseMessages()` 把 AI SDK 的前端消息转成 LangChain 消息
3. `agent.stream()` 运行 Agent
4. `toUIMessageStream()` 把 LangChain 输出转成 AI SDK UI Stream
5. `pipeUIMessageStreamToResponse()` 直接写回 HTTP 响应

### 为什么这个组合很舒服

- Agent 逻辑继续用 LangChain 写
- 前端协议、SSE 格式、消息解析交给 AI SDK
- 不用自己手搓一套 AGUI 协议转换器

---

## 4. 前端：`useChat` 拿到的已经不是“原始字符串”，而是“消息部件”

对应学习代码：

- `ai-agent-course-code-learn/agui-frontend/src/App.tsx`
- `ai-agent-course-code-learn/agui-frontend/src/components/ToolPanels.tsx`
- `ai-agent-course-code-learn/agui-frontend/src/components/StreamdownText.tsx`

### 前端最关键的变化

后端流过来的内容，前端不再自己拼字符串，而是交给：

- `@ai-sdk/react` 的 `useChat`

拿到的是一组 `messages`，每条 `message` 又由多个 `parts` 组成：

- 文本 part
- tool part
- 不同状态的 tool part

前端只要根据 `part.type` 和 tool name 渲染不同组件即可。

---

## 5. `Streamdown` 解决的是“文本也要像现代 Agent 一样渲染”

对应学习代码：

- `ai-agent-course-code-learn/agui-frontend/src/components/StreamdownText.tsx`

有了 AGUI 之后，Tool 组件能单独渲染了，但文本如果还是纯 `pre` 标签，体验依然粗糙。

`streamdown` 的价值在于：

- 支持流式 Markdown
- 代码块、表格、Mermaid 等都能渐进渲染
- 更接近真实 Agent 产品的交互体验

所以这一章其实分了两层升级：

1. 协议层升级：文本流 -> 事件流
2. 展示层升级：纯文字 -> Markdown / Tool 组件混合渲染

---

## 6. 这一章和前面章节的关系

### 和第18章的关系

第18章解决的是“AI 文本怎么流式输出”。

### 和第19-20章的关系

第19-20章解决的是“Agent 怎么调工具、怎么做定时任务”。

### 第22章新增的能力

第22章解决的是“这些工具调用和文本状态，怎么更好地显示到前端”。

所以它不是替代 LangChain，也不是替代 SSE，而是把前面已经会的能力，升级成真正可交互的 Agent UI。

---

## 7. 本章关键收获

### 架构层面

- LangChain 适合写 Agent 执行逻辑
- Vercel AI SDK 适合处理前后端流式消息协议
- AGUI 的价值在于“让 UI 理解 Agent 正在做什么”

### 工程层面

- 后端返回的应该是事件语义，不只是原始文本
- 前端应该按 `message parts` 渲染，而不是自己猜测流内容
- Tool 组件渲染和 Markdown 渲染，是现代 Agent 交互体验的两条主线

### 对应代码入口

- `ai-agent-course-code-learn/agui-backend/`
- `ai-agent-course-code-learn/agui-frontend/`

### Demo 启动

需要同时启动后端和前端：

```bash
# 终端1：启动后端
cd ai-agent-course-code-learn/agui-backend
npm run start:dev
# → http://localhost:3000  (Nest API)

# 终端2：启动前端
cd ai-agent-course-code-learn/agui-frontend
npm run dev
# → http://localhost:5173  (React + Vite)
```

