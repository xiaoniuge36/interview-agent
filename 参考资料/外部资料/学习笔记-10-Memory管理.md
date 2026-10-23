---
title: "第11章：Memory 管理的三大策略"
date: 2026-10-22
tags: [外部资料, Memory, Agent]
kind: reference
track: 外部资料
source: ai-god-learn/学习笔记/10-Memory管理/README.md
---

# 第11章：Memory 管理的三大策略

## 核心概念

大模型是**无状态的**，需要我们管理 Memory（消息历史），它才能继续之前的话题。

## 为什么需要 Memory 管理？

```javascript
// 没有 Memory 的情况
model.invoke("我叫张三");     // AI: 你好张三
model.invoke("我叫什么？");   // AI: 我不知道你叫什么 ❌

// 有 Memory 的情况
const messages = [];
messages.push(new HumanMessage("我叫张三"));
messages.push(await model.invoke(messages));  // AI: 你好张三
messages.push(new HumanMessage("我叫什么？"));
model.invoke(messages);  // AI: 你叫张三 ✅
```

**问题**：上下文有限（GPT-4o 约 200k token），messages 不能无限累积。

## 三大管理策略

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Memory 管理策略                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 1️⃣ 截断 (Truncation)                                          │  │
│  │    只保留最近 N 条消息或 N 个 token                            │  │
│  │    [msg1, msg2, msg3, msg4, msg5] → [msg4, msg5]              │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 2️⃣ 总结 (Summarization)                                       │  │
│  │    调用 LLM 对历史对话生成摘要                                 │  │
│  │    [msg1...msg8] + [msg9, msg10]                              │  │
│  │         ↓                    ↓                                │  │
│  │      摘要文本            保留最近                              │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 3️⃣ 检索 (Retrieval)                                           │  │
│  │    用向量数据库存储历史，语义检索相关内容                      │  │
│  │    "我之前提到的项目..." → Milvus 检索 → 找到相关对话          │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 策略对比

| 策略 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **截断** | 简单快速 | 丢失历史信息 | 短对话 |
| **总结** | 保留核心信息 | 消耗额外 token | Cursor、Claude Code |
| **检索** | 支持超长历史 | 需要向量数据库 | 长期记忆应用 |

## 存储层：短期 vs 长期记忆

```javascript
// 短期记忆 - 内存存储，程序关闭即丢失
const history = new InMemoryChatMessageHistory();

// 长期记忆 - 文件存储，持久保存
const history = new FileSystemChatMessageHistory({
  filePath: "./chat_history.json",
  sessionId: "user_001"
});
```

## 关键代码

### 1. 按消息数量截断

```javascript
const maxMessages = 4;
const allMessages = await history.getMessages();
const trimmedMessages = allMessages.slice(-maxMessages);
```

### 2. 按 token 数量截断

```javascript
import { trimMessages } from "@langchain/core/messages";
import { getEncoding } from "js-tiktoken";

const enc = getEncoding("cl100k_base");

const trimmed = await trimMessages(allMessages, {
  maxTokens: 100,
  tokenCounter: async (msgs) => {
    return msgs.reduce((total, m) => 
      total + enc.encode(m.content).length, 0);
  },
  strategy: "last"
});
```

### 3. 对话总结

```javascript
import { getBufferString } from "@langchain/core/messages";

// 格式化消息为字符串
const text = getBufferString(messages, {
  humanPrefix: "用户",
  aiPrefix: "助手"
});

// 调用 LLM 生成摘要
const summary = await model.invoke([
  new SystemMessage(`请总结以下对话：\n${text}\n总结：`)
]);
```

### 4. 向量数据库检索

```javascript
// 存储对话到 Milvus
const conversationText = `用户: ${input}\n助手: ${response}`;
await client.insert({
  collection_name: 'conversations',
  data: [{
    id: `conv_${Date.now()}`,
    vector: await embeddings.embedQuery(conversationText),
    content: conversationText,
    round: currentRound
  }]
});

// 检索相关历史
const results = await client.search({
  collection_name: 'conversations',
  vector: await embeddings.embedQuery(userQuestion),
  limit: 2,
  metric_type: MetricType.COSINE
});
```

## LangChain API 变化

**已废弃**（移到 @langchain/classic）：
- `BufferMemory`
- `ConversationSummaryMemory`
- `VectorStoreRetrieverMemory`

**现在推荐**：
- `InMemoryChatMessageHistory` - 内存存储
- `FileSystemChatMessageHistory` - 文件存储
- `trimMessages` - token 截断
- 自己实现总结和检索逻辑

## 实际应用：Cursor / Claude Code

```
达到上下文限制
     │
     ▼
触发自动总结
     │
     ▼
生成摘要，开始新一轮计数
```

## 最佳实践：总结 + 检索结合

```
1. 每聊 20 条 → 触发总结
2. 摘要存入 Milvus
3. 用户问"之前聊过什么" → RAG 检索摘要
4. 检索结果作为上下文 → LLM 生成回答
```

**优点**：
- 节省 token（存摘要不存原文）
- 支持超长对话历史
- 语义检索找到相关话题

## 文件结构

```
memory-test/
├── src/
│   ├── history-test.mjs          # InMemory 示例
│   ├── history-test2.mjs         # FileSystem 示例（写入）
│   ├── history-test3.mjs         # FileSystem 示例（恢复）
│   └── memory/
│       ├── truncation-memory.mjs     # 截断策略
│       ├── summarization-memory.mjs  # 总结策略（按条数）
│       ├── summarization-memory2.mjs # 总结策略（按 token）
│       ├── insert-conversations.mjs  # 对话存入 Milvus
│       └── retrieval-memory.mjs      # 检索策略
└── package.json
```

## 运行命令

```bash
cd memory-test

# 安装依赖
pnpm install dotenv @langchain/core @langchain/openai @langchain/community langchain js-tiktoken

# 测试内存存储
node src/history-test.mjs

# 测试文件存储
node src/history-test2.mjs
node src/history-test3.mjs

# 测试截断策略
node src/memory/truncation-memory.mjs

# 测试总结策略
node src/memory/summarization-memory.mjs

# 测试检索策略（需要先启动 Milvus）
node src/memory/insert-conversations.mjs
node src/memory/retrieval-memory.mjs
```
