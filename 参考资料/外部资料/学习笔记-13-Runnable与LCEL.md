---
title: "第15章：Runnable - 把写逻辑变成组装 chain"
date: 2026-10-22
tags: [外部资料, Runnable, LCEL, LangChain]
kind: reference
track: 外部资料
source: ai-god-learn/学习笔记/13-Runnable/README.md
---

# 第15章：Runnable - 把写逻辑变成组装 chain

## 核心概念

LangChain 的很多组件（PromptTemplate、ChatOpenAI、OutputParser 等）都实现了 Runnable 接口。

通过 Runnable API 可以**声明式**地组装 chain，从"写逻辑"变成"组装链条"。

这种声明式写法叫 **LCEL**（LangChain Expression Language）。

```
┌─────────────────────────────────────────────────────────────────┐
│                    Runnable API 全景                             │
├──────────────────────────┬──────────────────────────────────────┤
│      流程控制             │         数据处理                      │
├──────────────────────────┼──────────────────────────────────────┤
│ • RunnableSequence       │ • RunnableLambda                     │
│ • RunnableBranch (if/else│ • RunnablePassthrough                │
│ • RouterRunnable (switch)│ • RunnablePick                       │
│ • RunnableEach (循环)     │ • RunnableMap (并行)                 │
│ • RunnableWithMessageHist│ • pipe() 语法糖                       │
└──────────────────────────┴──────────────────────────────────────┘
```

## 从命令式到声明式

### Before（命令式）

```javascript
// 步骤 1: 格式化 prompt
const formattedPrompt = await promptTemplate.format(input);
// 步骤 2: 调用模型
const response = await model.invoke(formattedPrompt);
// 步骤 3: 解析输出
const result = await outputParser.invoke(response);
```

### After（声明式 LCEL）

```javascript
// 方式1：RunnableSequence
const chain = RunnableSequence.from([promptTemplate, model, outputParser]);
const result = await chain.invoke(input);

// 方式2：pipe 语法糖（本质一样）
const chain = promptTemplate.pipe(model).pipe(outputParser);
const result = await chain.invoke(input);
```

## Runnable 三大通用方法

所有 Runnable 都支持：

| 方法 | 说明 | 特点 |
|------|------|------|
| `invoke(input)` | 同步调用 | 依次调用链上每个组件的 invoke |
| `stream(input)` | 流式返回 | 调用链上每个组件的 stream |
| `batch(inputs)` | 批量调用 | 并发执行多个独立的 invoke |

## Runnable API 详解

### 1. RunnableSequence - 顺序执行

```javascript
import { RunnableSequence } from "@langchain/core/runnables";

const chain = RunnableSequence.from([promptTemplate, model, outputParser]);
const result = await chain.invoke(input);
```

### 2. RunnableLambda - 函数包装成 Runnable

```javascript
import { RunnableLambda } from "@langchain/core/runnables";

const addOne = RunnableLambda.from((input) => input + 1);
const multiplyTwo = RunnableLambda.from((input) => input * 2);

const chain = RunnableSequence.from([addOne, multiplyTwo, addOne]);
const result = await chain.invoke(5);  // (5+1)*2+1 = 13
```

### 3. RunnableMap - 并行执行

```javascript
import { RunnableMap, RunnableLambda } from "@langchain/core/runnables";

const runnableMap = RunnableMap.from({
  add: RunnableLambda.from((input) => input.num + 1),
  multiply: RunnableLambda.from((input) => input.num * 2),
  square: RunnableLambda.from((input) => input.num * input.num),
});

const result = await runnableMap.invoke({ num: 5 });
// { add: 6, multiply: 10, square: 25 }
```

### 4. RunnableBranch - if/else 逻辑

```javascript
import { RunnableBranch, RunnableLambda } from "@langchain/core/runnables";

const branch = RunnableBranch.from([
  [RunnableLambda.from((x) => x > 0), RunnableLambda.from((x) => `正数: ${x}`)],
  [RunnableLambda.from((x) => x < 0), RunnableLambda.from((x) => `负数: ${x}`)],
  RunnableLambda.from((x) => `零: ${x}`),  // default
]);

await branch.invoke(5);   // "正数: 5"
await branch.invoke(-3);  // "负数: -3"
await branch.invoke(0);   // "零: 0"
```

### 5. RouterRunnable - switch/case 逻辑

```javascript
import { RouterRunnable, RunnableLambda } from "@langchain/core/runnables";

const router = new RouterRunnable({
  runnables: {
    toUpperCase: RunnableLambda.from((text) => text.toUpperCase()),
    reverse: RunnableLambda.from((text) => text.split("").reverse().join("")),
  },
});

await router.invoke({ key: "toUpperCase", input: "hello" });  // "HELLO"
await router.invoke({ key: "reverse", input: "hello" });      // "olleh"
```

### 6. RunnablePassthrough - 透传原始输入

```javascript
import { RunnablePassthrough, RunnableSequence, RunnableMap } from "@langchain/core/runnables";

const chain = RunnableSequence.from([
  (input) => ({ concept: input }),
  RunnableMap.from({
    original: new RunnablePassthrough(),           // 透传
    processed: (obj) => ({ upper: obj.concept.toUpperCase() }),
  })
]);

await chain.invoke("hello");
// { original: { concept: "hello" }, processed: { upper: "HELLO" } }
```

**RunnablePassthrough.assign** - 保留原属性并扩展：

```javascript
const chain = RunnableSequence.from([
  (input) => ({ concept: input }),
  RunnablePassthrough.assign({
    upper: (obj) => obj.concept.toUpperCase(),
    length: (obj) => obj.concept.length,
  })
]);
// { concept: "hello", upper: "HELLO", length: 5 }
```

### 7. RunnableEach - 循环处理数组

```javascript
import { RunnableEach, RunnableLambda, RunnableSequence } from "@langchain/core/runnables";

const processItem = RunnableSequence.from([
  RunnableLambda.from((x) => x.toUpperCase()),
  RunnableLambda.from((x) => `你好，${x}！`),
]);

const chain = new RunnableEach({ bound: processItem });
await chain.invoke(["alice", "bob"]);
// ["你好，ALICE！", "你好，BOB！"]
```

### 8. RunnablePick - 提取属性

```javascript
import { RunnablePick, RunnableSequence } from "@langchain/core/runnables";

const chain = RunnableSequence.from([
  (input) => ({ ...input, fullInfo: `${input.name}，${input.age}岁` }),
  new RunnablePick(["name", "fullInfo"]),
]);

await chain.invoke({ name: "神光", age: 30, city: "北京" });
// { name: "神光", fullInfo: "神光，30岁" }
```

### 9. RunnableWithMessageHistory - chain + memory

```javascript
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";

const simpleChain = prompt.pipe(model).pipe(new StringOutputParser());

const chain = new RunnableWithMessageHistory({
  runnable: simpleChain,
  getMessageHistory: (sessionId) => getHistory(sessionId),
  inputMessagesKey: "question",
  historyMessagesKey: "history",
});

await chain.invoke(
  { question: "我叫神光" },
  { configurable: { sessionId: "user-123" } }
);
```

## 简化写法

LangChain 会自动转换：
- **函数** → `RunnableLambda`
- **对象** → `RunnableMap`

```javascript
// 简化前
RunnableSequence.from([
  RunnableLambda.from((input) => ({ concept: input })),
  RunnableMap.from({ ... })
]);

// 简化后
RunnableSequence.from([
  (input) => ({ concept: input }),
  { ... }
]);
```

## 关键代码速查

```javascript
// RunnableSequence / pipe - 顺序执行
const chain = RunnableSequence.from([a, b, c]);
const chain = a.pipe(b).pipe(c);

// RunnableLambda - 函数变 Runnable
const fn = RunnableLambda.from((x) => x + 1);

// RunnableMap - 并行
RunnableMap.from({ key1: runnable1, key2: runnable2 });

// RunnableBranch - if/else
RunnableBranch.from([[condition1, handler1], [condition2, handler2], defaultHandler]);

// RouterRunnable - switch/case
new RouterRunnable({ runnables: { key1: r1, key2: r2 } });

// RunnablePassthrough - 透传 / assign 扩展
new RunnablePassthrough();
RunnablePassthrough.assign({ newField: (obj) => ... });

// RunnableEach - 循环
new RunnableEach({ bound: chain });

// RunnablePick - 提取属性
new RunnablePick(["name", "age"]);

// RunnableWithMessageHistory - memory
new RunnableWithMessageHistory({ runnable, getMessageHistory, inputMessagesKey, historyMessagesKey });
```

## Runnable API 对照表

| API | 作用 | 类比 |
|-----|------|------|
| RunnableSequence | 顺序执行 | `a → b → c` |
| RunnableLambda | 函数包装 | `function → Runnable` |
| RunnableMap | 并行执行 | `Promise.all` |
| RunnableBranch | 条件分支 | `if / else` |
| RouterRunnable | 路由分发 | `switch / case` |
| RunnableEach | 循环处理 | `array.map()` |
| RunnablePassthrough | 透传输入 | 保持原始值 |
| RunnablePick | 提取属性 | `pick(obj, keys)` |
| RunnableWithMessageHistory | chain + memory | 自动管理对话历史 |

## 学习文件

| 文件 | 内容 |
|------|------|
| `学习文档/15.Runnable：把写逻辑变成组装 chain.md` | 原始课程文档 |
| `ai-agent-course-code-learn/runnable-test/` | 学习代码 |
| `ai-agent-course-code/runnable-test/` | 课程原始代码 |
