---
title: "第10章：RAG 实战 - 电子书语义检索助手"
date: 2026-10-22
tags: [外部资料, RAG, 实战]
kind: reference
track: 外部资料
source: ai-god-learn/学习笔记/09-RAG实战/README.md
---

# 第10章：RAG 实战 - 电子书语义检索助手

## 核心概念

本章将 Loader、Splitter、Milvus 向量数据库串联起来，实现一个完整的 RAG 应用。

## 完整 RAG 流程图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        知识入库（离线阶段）                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   📚 EPUB电子书                                                     │
│        │                                                            │
│        ▼                                                            │
│   ┌─────────────┐                                                   │
│   │  EPubLoader │ ──按章节拆分──▶ [第1章, 第2章, 第3章, ...]       │
│   └─────────────┘                                                   │
│        │                                                            │
│        ▼                                                            │
│   ┌───────────────────────────┐                                     │
│   │ RecursiveTextSplitter     │ ──每章再分块──▶ [块1, 块2, ...]    │
│   │ chunkSize: 500            │                                     │
│   │ chunkOverlap: 50          │                                     │
│   └───────────────────────────┘                                     │
│        │                                                            │
│        ▼                                                            │
│   ┌─────────────┐                                                   │
│   │  Embeddings │ ──向量化──▶ [1024维向量, 1024维向量, ...]        │
│   └─────────────┘                                                   │
│        │                                                            │
│        ▼                                                            │
│   ┌─────────────┐                                                   │
│   │   Milvus    │ ◀── 存储向量 + 元信息                            │
│   └─────────────┘                                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        用户查询（在线阶段）                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   🙋 用户提问: "段誉会什么武功？"                                   │
│        │                                                            │
│        ▼                                                            │
│   ┌─────────────┐                                                   │
│   │  Embeddings │ ──向量化──▶ [1024维向量]                         │
│   └─────────────┘                                                   │
│        │                                                            │
│        ▼                                                            │
│   ┌─────────────┐                                                   │
│   │   Milvus    │ ──余弦相似度检索──▶ [相关片段1, 片段2, 片段3]    │
│   └─────────────┘                                                   │
│        │                                                            │
│        ▼                                                            │
│   ┌─────────────┐                                                   │
│   │  构建Prompt │ ◀── 检索结果 + 用户问题                          │
│   └─────────────┘                                                   │
│        │                                                            │
│        ▼                                                            │
│   ┌─────────────┐                                                   │
│   │     LLM     │ ──生成回答──▶ "段誉会凌波微步、北冥神功..."      │
│   └─────────────┘                                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 关键代码解析

### 1. 集合 Schema 设计

```javascript
const fields = [
  { name: 'id', data_type: DataType.VarChar, is_primary_key: true },
  { name: 'book_id', data_type: DataType.VarChar },      // 关联 MySQL
  { name: 'book_name', data_type: DataType.VarChar },    // 书名
  { name: 'chapter_num', data_type: DataType.Int32 },    // 第几章
  { name: 'index', data_type: DataType.Int32 },          // 章内第几块
  { name: 'content', data_type: DataType.VarChar },      // 文本内容
  { name: 'vector', data_type: DataType.FloatVector, dim: 1024 }  // 向量
];
```

**元信息作用**：
- `book_id`：与 MySQL book 表关联，可查询书籍详情
- `chapter_num` + `index`：定位内容来源，便于上下文拼接

### 2. 电子书加载与分块

```javascript
// 1. 加载 EPUB，按章节拆分
const loader = new EPubLoader('./天龙八部.epub', { splitChapters: true });
const documents = await loader.load();  // 返回多个 Document

// 2. 每章再用 Splitter 细分
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 50  // 保持上下文连贯
});

for (const chapter of documents) {
  const chunks = await splitter.splitText(chapter.pageContent);
  // 向量化并插入 Milvus...
}
```

### 3. 语义检索 + LLM 回答

```javascript
// 1. 问题向量化
const queryVector = await embeddings.embedQuery("段誉会什么武功？");

// 2. Milvus 检索
const results = await client.search({
  collection_name: 'ebook_collection',
  vector: queryVector,
  limit: 3,
  metric_type: MetricType.COSINE,
  output_fields: ['chapter_num', 'content']
});

// 3. 构建 Prompt
const context = results.results
  .map(item => `[第${item.chapter_num}章] ${item.content}`)
  .join('\n\n');

const prompt = `根据以下《天龙八部》片段回答问题：
${context}

问题: 段誉会什么武功？
要求: 结合原文，准确回答。`;

// 4. 调用大模型
const response = await model.invoke(prompt);
```

## 核心要点

| 要点 | 说明 |
|------|------|
| 同一嵌入模型 | 入库和查询必须用同一个模型 |
| 向量维度一致 | Schema 的 dim 必须等于模型输出维度 |
| loadCollection | 必须加载集合到内存才能检索 |
| 流式处理 | 大文件边处理边插入，避免内存溢出 |
| Prompt 设计 | 明确要求"结合原文"、"如实告知" |

## 与 MySQL 关键词搜索对比

| 场景 | MySQL | Milvus |
|------|-------|--------|
| 查"武功" | 只能匹配含"武功"二字的内容 | 能找到"功夫"、"招式"等语义相关内容 |
| 查"心情好" | 匹配不到"今天很开心" | 能理解"心情好"≈"开心" |

## 文件结构

```
milvus-test/
├── src/
│   ├── ebook-writer.mjs    # 电子书入库（Loader + Splitter + Insert）
│   ├── ebook-query.mjs     # 单纯检索（不调用 LLM）
│   └── ebook-reader-rag.mjs # 完整 RAG（检索 + LLM 回答）
└── package.json
```

## 运行命令

```bash
cd milvus-test

# 安装依赖
pnpm install @langchain/community epub2 html-to-text @langchain/textsplitters

# 电子书入库
node src/ebook-writer.mjs

# 测试检索
node src/ebook-query.mjs

# 完整 RAG
node src/ebook-reader-rag.mjs
```
