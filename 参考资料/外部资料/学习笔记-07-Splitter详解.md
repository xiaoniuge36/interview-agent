---
title: "LangChain Splitter 详解"
date: 2026-10-22
tags: [外部资料, Splitter, RAG]
kind: reference
track: 外部资料
source: ai-god-learn/学习笔记/07-Loader和Splitter/Splitter详解.md
---

# LangChain Splitter 详解

## 零、为什么需要文本分割？

在大模型应用（特别是 RAG）中，文档通常很大，需要分割的原因：

```
原始文档（很大）
    ↓ Splitter 分割
小块文档（Chunk）
    ↓ Embedding 向量化
存入向量数据库
    ↓ 检索相关内容
放入 Prompt → LLM 生成回答
```

| 原因 | 说明 |
|------|------|
| **向量化成本** | 一次性向量化大文档成本高 |
| **检索精度** | 小块更容易精准匹配用户问题 |
| **Context 限制** | LLM 有 token 上限，放不下整个文档 |

### Chunk 是什么？

**Chunk = 块 = 一小段文本**

```
原始文档（一整块面包）
        ↓  Splitter 分割
    ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
    │Chunk│ │Chunk│ │Chunk│ │Chunk│
    │  1  │ │  2  │ │  3  │ │  4  │
    └─────┘ └─────┘ └─────┘ └─────┘
        ↓
   每块单独向量化，存入数据库
```

---

## 一、Splitter 概览

### 继承关系

```
TextSplitter (基类)
  ├── CharacterTextSplitter        # 按单一字符分割
  ├── RecursiveCharacterTextSplitter  # 递归分割（推荐）
  │     ├── MarkdownTextSplitter    # Markdown 分割
  │     └── LatexTextSplitter       # LaTeX 分割
  └── TokenTextSplitter            # 按 Token 分割
```

### 核心结论

**直接用 `RecursiveCharacterTextSplitter` 就够了！**

---

## 二、核心概念区分

### separator vs chunkSize

| 概念 | 作用 |
|------|------|
| **separator** | 用什么来分割文本（如 `\n`、`。`） |
| **chunkSize** | 每个块的目标大小 |

### 分割流程

```
原文 → 按 separator 分割 → 按 chunkSize 装入 chunk → 超出则加 overlap
```

---

## 三、chunkOverlap 详解

### 什么时候会有 overlap？

**只有文本被断开时才有 overlap！**

```
原文：今天天气很好。我们去公园玩。公园里花很多。

情况1：chunkSize 足够大，文本不断开
  块1: 今天天气很好。我们去公园玩。公园里花很多。
  → 没有 overlap

情况2：chunkSize 小，文本被断开
  块1: 今天天气很好。我们去公园玩。
  块2: 我们去公园玩。公园里花很多。  ← overlap 部分
  → 有 overlap
```

### 推荐设置

```javascript
chunkOverlap = chunkSize * 0.1 ~ 0.2  // 10%-20%
```

### Overlap 的作用：保证语义连贯

**没有 Overlap 的问题**：

```
原文："今天学习了向量数据库，感觉向量搜索技术真的很强大"

无 Overlap 分割：
Chunk 1: "今天学习了向量数据库，感觉"    ← 话说一半被切断
Chunk 2: "向量搜索技术真的很强大"        ← 开头没有上下文
```

**有 Overlap 的效果**：

```
Chunk 1: "今天学习了向量数据库，感觉向量搜索"
Chunk 2: "感觉向量搜索技术真的很强大"  ← 重复了"感觉向量搜索"，语义连贯
```

**代价**：会有一点存储冗余，但换来检索和理解的准确性。

---

## 四、各 Splitter 对比

### 1. CharacterTextSplitter

**特点**：按单一 separator 分割

```javascript
const splitter = new CharacterTextSplitter({
  separator: '\n',
  chunkSize: 200,
  chunkOverlap: 20
});
```

**问题**：非常死板！

- 如果一行超过 chunkSize，不会继续拆分
- 实际应用中容易出问题

---

### 2. RecursiveCharacterTextSplitter（推荐）

**特点**：递归分割，多个 separator 按优先级尝试

```javascript
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 150,
  chunkOverlap: 20,
  separators: ['\n', '。', '，']  // 优先用 \n，不行再用 。，还不行用 ，
});
```

**优点**：
- 灵活，保证语义完整性
- chunk 可能 < chunkSize（保证语义完整）
- 不会强行断开文本

---

### 3. TokenTextSplitter

**特点**：按 Token 数分割（不是字符数）

```javascript
const splitter = new TokenTextSplitter({
  chunkSize: 50,           // 50 个 Token
  chunkOverlap: 10,        // 重叠 10 个 Token
  encodingName: 'cl100k_base',  // OpenAI 编码
});
```

**问题**：
- 严格按 Token 数，可能强行断开文本
- 破坏语义完整性

**更好的方案**：用 RecursiveCharacterTextSplitter + 自定义 lengthFunction

```javascript
import { getEncoding } from "js-tiktoken";

const enc = getEncoding("cl100k_base");

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 150,
  chunkOverlap: 20,
  separators: ['\n', '。', '，'],
  lengthFunction: (text) => enc.encode(text).length,  // 按 token 计算长度
});
```

---

## 五、特殊格式分割

### Markdown 分割

```javascript
import { MarkdownTextSplitter } from "@langchain/textsplitters";

const splitter = new MarkdownTextSplitter({
  chunkSize: 400,
  chunkOverlap: 80
});
// 自动按 #、##、### 等标题分割
```

### LaTeX 分割

```javascript
import { LatexTextSplitter } from "@langchain/textsplitters";

const splitter = new LatexTextSplitter({
  chunkSize: 200,
  chunkOverlap: 40
});
// 按 LaTeX 语法分割
```

### 代码分割

```javascript
const splitter = RecursiveCharacterTextSplitter.fromLanguage('js', {
  chunkSize: 300,
  chunkOverlap: 60,
});
// 支持：java、go、js、html、python、rust、swift、markdown 等
```

---

## 六、Token 计算

### 什么是 Token？

Token 是大模型输入的基本单位，与字符数不是 1:1 的关系。

```javascript
import { getEncoding, getEncodingNameForModel } from "js-tiktoken";

// 获取模型编码名称
const encodingName = getEncodingNameForModel("gpt-4");  // cl100k_base

// 计算 token 数
const enc = getEncoding("cl100k_base");
console.log(enc.encode("apple").length);      // 1
console.log(enc.encode("pineapple").length);  // 2
console.log(enc.encode("苹果").length);        // 2
console.log(enc.encode("一二三").length);      // 3
```

---

## 七、最佳实践

### 推荐配置

```javascript
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getEncoding } from "js-tiktoken";

const enc = getEncoding("cl100k_base");

// 通用场景
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 50,
  separators: ['\n\n', '\n', '。', '！', '？', '，', ' '],
});

// 需要精确控制 Token 的场景
const tokenSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 200,  // 200 tokens
  chunkOverlap: 20,
  separators: ['\n\n', '\n', '。', '！', '？', '，', ' '],
  lengthFunction: (text) => enc.encode(text).length,
});
```

### chunkSize 选择建议

| 场景 | 推荐 chunkSize |
|------|----------------|
| 问答系统 | 300-500 |
| 文档摘要 | 1000-2000 |
| 代码分析 | 按函数/类 |

---

## 八、总结

| Splitter | 特点 | 推荐度 |
|----------|------|--------|
| CharacterTextSplitter | 单一分隔符，死板 | ⭐ |
| RecursiveCharacterTextSplitter | 递归分割，灵活 | ⭐⭐⭐⭐⭐ |
| TokenTextSplitter | 按 Token，可能断开语义 | ⭐⭐ |
| MarkdownTextSplitter | Markdown 专用 | ⭐⭐⭐⭐ |
| fromLanguage() | 代码专用 | ⭐⭐⭐⭐ |

**结论：绝大多数情况用 RecursiveCharacterTextSplitter 就够了！**
