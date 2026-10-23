---
title: "第12-13章：Output Parser 输出控制"
date: 2026-10-22
tags: [外部资料, OutputParser, 结构化输出]
kind: reference
track: 外部资料
source: ai-god-learn/学习笔记/11-OutputParser/README.md
---

# 第12-13章：Output Parser 输出控制

## 核心概念

大模型的输出控制分为两大主题：

```
┌─────────────────────────────────────────────────────────────┐
│                    输出控制 (Output Control)                  │
├─────────────────────────────┬───────────────────────────────┤
│      结构化输出              │         流式输出               │
│   (Structured Output)        │      (Streaming)              │
├─────────────────────────────┼───────────────────────────────┤
│ • withStructuredOutput       │ • model.stream()              │
│ • Tool Calling               │ • AIMessageChunk.concat()     │
│ • JSON Schema                │ • JsonOutputToolsParser       │
│ • Output Parser (旧)         │ • 增量打印 tool 参数           │
└─────────────────────────────┴───────────────────────────────┘
```

## 第12章：结构化输出

### 三种方式对比

| 方式 | 推荐度 | 可靠性 | 原理 |
|------|--------|--------|------|
| `withStructuredOutput` | ⭐⭐⭐ | 最高 | 自动选择 tool/json_schema/parser |
| Tool Calling | ⭐⭐ | 高 | 模型训练保证格式 |
| Output Parser | ⭐ | 中 | prompt 加格式描述 + parse |

### withStructuredOutput（最推荐）

```javascript
import { z } from "zod";

const schema = z.object({
  name: z.string().describe("姓名"),
  age: z.number().describe("年龄"),
  skills: z.array(z.string()).describe("技能")
});

// 一行搞定
const result = await model.withStructuredOutput(schema).invoke("提取信息...");
// result = { name: "张三", age: 28, skills: ["Java", "Python"] }
```

### withStructuredOutput 底层三种实现

```
withStructuredOutput(schema)
  ├── Tool Calling      ← 最常用
  ├── JSON Schema       ← 模型原生支持时
  └── Output Parser     ← 兜底方案
```

### Output Parser 的原理

```
getFormatInstructions() → 加入 prompt → 模型按格式输出 → parse() 解析
```

常用 Parser：
- `JsonOutputParser` - 解析 JSON（处理 markdown 语法）
- `StructuredOutputParser` - 指定字段结构
- `XMLOutputParser` - 解析 XML
- `JsonOutputToolsParser` - 流式 tool 参数解析

### 流式输出对比

| 方式 | 是否真流式 | 原因 |
|------|-----------|------|
| `model.stream()` | ✅ 真流式 | 每个 chunk 有内容 |
| `withStructuredOutput.stream()` | ❌ 假流式 | 底层 tool call，等 JSON 完整才返回 |
| `StructuredOutputParser + stream` | ✅ 真流式 | 边打印边积累，最后 parse |

## 第13章：实战

### 实战1：智能录入

```
传统：填表单 / 上传 Excel → 代码解析 → 入库
AI：  一段文字 → withStructuredOutput 提取 → 批量入库
```

核心代码：
```javascript
const friendsSchema = z.array(z.object({
  name: z.string(),
  phone: z.string().nullable(),
  company: z.string().nullable()
}));

const structuredModel = model.withStructuredOutput(friendsSchema);
const results = await structuredModel.invoke(text);
await connection.query('INSERT INTO friends VALUES ?', [values]);
```

### 实战2：流式版 Mini Cursor

#### 两个核心难点

| 难点 | 非流式 | 流式 |
|------|--------|------|
| 消息类型 | 完整 AIMessage | AIMessageChunk（需要 concat） |
| Tool 参数 | 完整 tool_calls | tool_call_chunks（需要 parse） |

#### 解决方案

```javascript
// 难点1：concat 拼接 chunk
let fullMsg = null;
for await (const chunk of stream) {
  fullMsg = fullMsg ? fullMsg.concat(chunk) : chunk;
}

// 难点2：JsonOutputToolsParser 解析 tool_call_chunks
const parsed = await toolParser.parseResult([{ message: fullMsg }]);

// 增量打印
const newContent = content.slice(printedLength);
process.stdout.write(newContent);
```

#### 完整流程

```
model.stream() → AIMessageChunk 流
    ↓
每个 chunk 用 concat 拼接
    ↓
JsonOutputToolsParser 解析累积的 chunk
    ↓
如果是 write_file → 增量打印代码
    ↓
流结束 → 完整 AIMessage 存入 memory
    ↓
从 AIMessage.tool_calls 取参数 → 执行工具
```

## 关键代码速查

```javascript
// ========== 结构化输出 ==========
// 最推荐
const result = await model.withStructuredOutput(schema).invoke("...");

// Tool Calling
const result = (await model.bindTools([{name, schema}]).invoke("...")).tool_calls[0].args;

// Output Parser
const result = await parser.parse((await model.invoke(prompt + parser.getFormatInstructions())).content);

// ========== 流式输出 ==========
// 基础流式
for await (const chunk of await model.stream("...")) {
  process.stdout.write(chunk.content);
}

// 流式 Tool 参数解析
const parser = new JsonOutputToolsParser();
const chain = modelWithTool.pipe(parser);
for await (const chunk of await chain.stream("...")) {
  console.log(chunk[0].args);  // 每次都是合法 JSON
}

// AIMessageChunk 拼接
fullMsg = fullMsg ? fullMsg.concat(chunk) : chunk;
```

## 企业应用场景

| 场景 | 技术 | 说明 |
|------|------|------|
| CRM 智能录入 | withStructuredOutput | 文本 → 结构化 → 数据库 |
| 简历解析 | withStructuredOutput | PDF → 教育/工作/技能 |
| AI 对话 | stream + SSE | 打字机效果 |
| Cursor/Copilot | JsonOutputToolsParser | 边生成边显示代码 |
| 合同审查 | withStructuredOutput | 提取关键条款 |
| 情感分析 | withStructuredOutput | 评论 → 情感/关键词 |

## 学习文件

| 文件 | 内容 |
|------|------|
| `学习文档/12.结构化大模型输出：output parser 还是 tool？.md` | 原始课程文档 |
| `学习文档/13.output Parser 实战：智能录入 + 流式版 mini cursor.md` | 原始课程文档 |
| `ai-agent-course-code-learn/output-parser-test/` | 学习代码（17个文件） |
| `ai-agent-course-code/output-parser-test/` | 课程原始代码 |
