---
title: "第7章：Loader 和 Splitter - 学习笔记"
date: 2026-10-22
tags: [外部资料, Loader, Splitter, RAG]
kind: reference
track: 外部资料
source: ai-god-learn/学习笔记/07-Loader和Splitter/README.md
---

# 第7章：Loader 和 Splitter - 学习笔记

## 一、为什么需要 Loader 和 Splitter？

### 问题

- 知识来源多样：PDF、Word、网页、YouTube 等
- 文档可能很大：一本书几万字

### 解决

- **Loader**：从各种来源加载内容，转成 Document
- **Splitter**：把大文档分割成小块

---

## 二、Loader 概述

### 作用

```
网页 URL  ──→ CheerioWebBaseLoader ──→ Document
PDF 文件  ──→ PDFLoader            ──→ Document
Word 文件 ──→ DocxLoader           ──→ Document
YouTube  ──→ YoutubeLoader         ──→ Document
```

### 数量

LangChain 有 **180+ Loader**，在 `@langchain/community` 包中。

---

## 三、使用 Loader

### 网页加载示例

```javascript
import "cheerio";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";

const loader = new CheerioWebBaseLoader(
  "https://juejin.cn/post/xxx",
  {
    selector: '.main-area p'  // CSS 选择器，只取文章段落
  }
);

const documents = await loader.load();
console.log(documents[0].pageContent);  // 文档内容
console.log(documents[0].metadata);     // 元数据（来源 URL 等）
```

---

## 四、Splitter 概述

### 为什么要分块？

| 问题 | 不分块的后果 |
|------|-------------|
| 向量化成本 | 大文档处理慢、费钱 |
| 检索精度 | 整本书 vs 一小段，精度低 |
| Context 限制 | 可能超出 LLM 上下文长度 |

### 分块参数

| 参数 | 说明 |
|------|------|
| **chunkSize** | 每块大小（字符数） |
| **chunkOverlap** | 块之间重叠（保持上下文连贯） |
| **separators** | 分割符（优先级从高到低） |

---

## 五、使用 Splitter

```javascript
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,      // 每块约 500 字符
  chunkOverlap: 50,    // 前后重叠 50 字符
  separators: ["。", "！", "？"],  // 优先按句号分割
});

const splitDocuments = await textSplitter.splitDocuments(documents);

console.log(`分割成 ${splitDocuments.length} 个块`);
```

---

## 六、分块策略

### chunkOverlap 的作用

```
原文：今天天气很好。我们去公园玩。公园里有很多花。

chunkOverlap = 0:
  块1: 今天天气很好。我们去公园玩。
  块2: 公园里有很多花。  ← 上下文断裂

chunkOverlap = 10:
  块1: 今天天气很好。我们去公园玩。
  块2: 我们去公园玩。公园里有很多花。  ← 重叠保持连贯
```

### 选择合适的 chunkSize

| 场景 | 建议 chunkSize |
|------|----------------|
| 问答系统 | 300-500 |
| 文档摘要 | 1000-2000 |
| 代码分析 | 按函数/类分割 |

---

## 七、完整 RAG 流程（含 Loader + Splitter）

```javascript
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";

// 1. Loader：加载网页
const loader = new CheerioWebBaseLoader(url, { selector: '.content' });
const documents = await loader.load();

// 2. Splitter：分割文档
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 50,
});
const splitDocs = await splitter.splitDocuments(documents);

// 3. 向量化存储
const embeddings = new OpenAIEmbeddings({ model: "text-embedding-v3" });
const vectorStore = await MemoryVectorStore.fromDocuments(splitDocs, embeddings);

// 4. 创建检索器
const retriever = vectorStore.asRetriever({ k: 3 });

// 5. 检索 + 生成
const docs = await retriever.invoke(question);
const context = docs.map(d => d.pageContent).join("\n\n");
const response = await model.invoke(`基于：${context}\n回答：${question}`);
```

---

## 八、常用 Loader 列表

| Loader | 用途 | 包 |
|--------|------|-----|
| CheerioWebBaseLoader | 网页 | @langchain/community |
| PDFLoader | PDF 文件 | @langchain/community |
| DocxLoader | Word 文档 | @langchain/community |
| CSVLoader | CSV 文件 | @langchain/community |
| JSONLoader | JSON 文件 | @langchain/community |
| TextLoader | 纯文本 | @langchain/community |
| YoutubeLoader | YouTube 视频 | @langchain/community |

---

## 九、核心 API

| API | 作用 |
|-----|------|
| `new CheerioWebBaseLoader(url, {selector})` | 创建网页加载器 |
| `loader.load()` | 加载文档 |
| `new RecursiveCharacterTextSplitter({...})` | 创建递归分割器 |
| `splitter.splitDocuments(docs)` | 分割文档 |

---

## 十、本章要点

- [ ] 理解 Loader 的作用和种类
- [ ] 掌握 CheerioWebBaseLoader 的使用
- [ ] 理解 Splitter 的作用
- [ ] 掌握 chunkSize 和 chunkOverlap 的含义
- [ ] 能够完成 Loader + Splitter + RAG 的完整流程
