---
title: "第9章：向量数据库 Milvus - 学习笔记"
date: 2026-10-22
tags: [外部资料, Milvus, 向量数据库, RAG]
kind: reference
track: 外部资料
source: ai-god-learn/学习笔记/08-向量数据库Milvus/README.md
---

# 第9章：向量数据库 Milvus - 学习笔记

## 一、为什么需要向量数据库？

### AI Agent 的数据存储需求

```
传统应用：用户数据 → MySQL → 按 ID/关键词查询
AI 应用：知识/记忆 → Milvus → 按语义查询
```

### MySQL vs Milvus

| 对比 | MySQL | Milvus |
|------|-------|--------|
| 查询方式 | ID、关键词精确匹配 | 语义相似度匹配 |
| 数据形式 | 结构化数据 | 高维向量 |
| 典型场景 | CRUD 业务逻辑 | AI 知识/记忆检索 |
| 查询示例 | `WHERE mood = 'happy'` | "心情好的日记" |

### 实际场景示例：AI 日记本

```
查询日记列表 → MySQL（按日期排序、分页）
"哪几天心情比较好" → Milvus（语义检索）→ AI 生成回答
```

### 双写模式

一般做 **MySQL + Milvus 双写**：
- MySQL：存结构化数据，做列表查询、关联查询
- Milvus：存向量，做语义检索
- 同时对两者做增删改查，保持数据同步

---

## 二、Milvus 数据结构

```
Database（数据库）
  └── Collection（集合 ≈ 表）
        └── Entity（实体 ≈ 行）
              └── Fields（字段 ≈ 列）
```

---

## 三、Schema 定义

```javascript
await client.createCollection({
  collection_name: 'ai_diary',
  fields: [
    { name: 'id', data_type: DataType.VarChar, max_length: 50, is_primary_key: true },
    { name: 'vector', data_type: DataType.FloatVector, dim: 1024 },  // 核心：向量字段
    { name: 'content', data_type: DataType.VarChar, max_length: 5000 },
    { name: 'date', data_type: DataType.VarChar, max_length: 50 },
    { name: 'mood', data_type: DataType.VarChar, max_length: 50 },
    { name: 'tags', data_type: DataType.Array, element_type: DataType.VarChar, max_capacity: 10, max_length: 50 }
  ]
});
```

**关键点**：
- `FloatVector`：向量类型，`dim` 必须与嵌入模型维度一致
- 其他字段是元数据，检索时一并返回

---

## 四、索引与距离度量

向量字段必须建索引：

```javascript
await client.createIndex({
  collection_name: COLLECTION_NAME,
  field_name: 'vector',
  index_type: IndexType.IVF_FLAT,     // 索引类型
  metric_type: MetricType.COSINE,     // 距离度量：余弦相似度
  params: { nlist: 1024 }
});
```

| 距离度量 | 说明 | 值域 |
|---------|------|------|
| COSINE | 余弦相似度 | [-1, 1]，越大越相似 |
| L2 | 欧氏距离 | [0, ∞)，越小越相似 |
| IP | 内积 | 越大越相似 |

---

## 五、核心 API

### 插入数据

```javascript
// 1. 向量化内容
const vector = await embeddings.embedQuery(content);

// 2. 插入
await client.insert({
  collection_name: COLLECTION_NAME,
  data: [{ id, vector, content, date, mood, tags }]
});
```

### 向量检索

```javascript
const queryVector = await embeddings.embedQuery("户外活动");

const results = await client.search({
  collection_name: COLLECTION_NAME,
  vector: queryVector,
  limit: 2,
  metric_type: MetricType.COSINE,
  output_fields: ['id', 'content', 'date', 'mood', 'tags']
});
```

### 更新数据（Upsert）

```javascript
await client.upsert({
  collection_name: COLLECTION_NAME,
  data: [{ id: 'diary_001', vector, content, date, mood, tags }]
});
```

### 删除数据

```javascript
// 按 ID 删除
await client.delete({
  collection_name: COLLECTION_NAME,
  filter: `id == "diary_001"`
});

// 批量删除
await client.delete({
  collection_name: COLLECTION_NAME,
  filter: `id in ["diary_002", "diary_003"]`
});

// 条件删除
await client.delete({
  collection_name: COLLECTION_NAME,
  filter: `mood == "sad"`
});
```

---

## 六、RAG 集成流程

```
用户提问 → Embeddings向量化 → Milvus检索 → 相关文档
                                              ↓
                                构建Prompt（问题+文档）
                                              ↓
                                        LLM生成回答
```

核心代码：

```javascript
// 1. 检索相关文档
const queryVector = await embeddings.embedQuery(question);
const results = await client.search({
  collection_name: COLLECTION_NAME,
  vector: queryVector,
  limit: 2,
  output_fields: ['content', 'date', 'mood']
});

// 2. 构建增强 Prompt
const context = results.results.map(r => r.content).join('\n');
const prompt = `基于以下内容回答：\n${context}\n\n问题：${question}`;

// 3. 调用 LLM
const response = await model.invoke(prompt);
```

---

## 七、本地运行 Milvus

### Docker Compose 启动

```bash
# 下载配置文件
# https://github.com/milvus-io/milvus/releases

# 启动
docker compose -f ./milvus-standalone-docker-compose.yml up -d

# 健康检查
curl http://localhost:9091/healthz
```

### GUI 工具：Attu

下载：https://github.com/zilliztech/attu/releases

连接地址：`localhost:19530`

---

## 八、完整 CRUD 示例

### 插入数据

```javascript
import { MilvusClient, DataType, IndexType, MetricType } from '@zilliz/milvus2-sdk-node';
import { OpenAIEmbeddings } from "@langchain/openai";

const client = new MilvusClient({ address: 'localhost:19530' });

// 1. 创建集合
await client.createCollection({
  collection_name: 'ai_diary',
  fields: [
    { name: 'id', data_type: DataType.VarChar, max_length: 50, is_primary_key: true },
    { name: 'vector', data_type: DataType.FloatVector, dim: 1024 },
    { name: 'content', data_type: DataType.VarChar, max_length: 5000 },
    { name: 'date', data_type: DataType.VarChar, max_length: 50 },
    { name: 'mood', data_type: DataType.VarChar, max_length: 50 },
    { name: 'tags', data_type: DataType.Array, element_type: DataType.VarChar, max_capacity: 10, max_length: 50 }
  ]
});

// 2. 创建索引
await client.createIndex({
  collection_name: 'ai_diary',
  field_name: 'vector',
  index_type: IndexType.IVF_FLAT,
  metric_type: MetricType.COSINE,
  params: { nlist: 1024 }
});

// 3. 加载集合（必须！）
await client.loadCollection({ collection_name: 'ai_diary' });

// 4. 插入数据
const vector = await embeddings.embedQuery("今天心情很好");
await client.insert({
  collection_name: 'ai_diary',
  data: [{ id: 'diary_001', vector, content: "今天心情很好", date: "2026-01-10", mood: "happy", tags: ["生活"] }]
});
```

### 查询数据

```javascript
const queryVector = await embeddings.embedQuery("户外活动");
const results = await client.search({
  collection_name: 'ai_diary',
  vector: queryVector,
  limit: 2,
  metric_type: MetricType.COSINE,
  output_fields: ['id', 'content', 'date', 'mood', 'tags']
});

results.results.forEach(item => {
  console.log(`Score: ${item.score}, Content: ${item.content}`);
});
```

### 更新数据（Upsert）

```javascript
const newVector = await embeddings.embedQuery("今天下雨，心情不好");
await client.upsert({
  collection_name: 'ai_diary',
  data: [{
    id: 'diary_001',  // 相同 ID 会更新
    vector: newVector,
    content: "今天下雨，心情不好",
    date: "2026-01-10",
    mood: "sad",
    tags: ["生活"]
  }]
});
```

### 删除数据

```javascript
// 按 ID 删除
await client.delete({
  collection_name: 'ai_diary',
  filter: `id == "diary_001"`
});

// 批量删除
await client.delete({
  collection_name: 'ai_diary',
  filter: `id in ["diary_002", "diary_003"]`
});

// 条件删除
await client.delete({
  collection_name: 'ai_diary',
  filter: `mood == "sad"`
});
```

---

## 九、深入理解：Vector 与 Embedding

### Vector（向量）是什么？

**Vector = 一串数字**，用来表示文本的"语义含义"。

```javascript
// 例如 "今天天气很好" 向量化后变成：
[0.023, -0.156, 0.892, 0.445, ..., 0.234]  // 1024个数字
```

### Embedding 模型的作用

**Embedding 模型**就像一个"翻译器"，把文本翻译成向量。

**规则**：
- 相同文本 → 相同向量
- 语义相似的文本 → 向量接近（在高维空间里距离近）

```javascript
embeddings.embedQuery("户外活动")     // → [0.12, 0.19, 0.35, ...]
embeddings.embedQuery("去公园散步")   // → [0.11, 0.20, 0.33, ...]  ← 很接近！
embeddings.embedQuery("学习编程")     // → [0.85, 0.02, 0.91, ...]  ← 差很远！
```

### 存储 vs 查询：两个阶段

```
【存储阶段 - 一次性，向量固定】
日记1: "去公园散步" → [0.1, 0.2, ...] ─┐
日记2: "学习Milvus" → [0.5, 0.3, ...] ─┼─→ 存入 Milvus（固定不变）
日记3: "做了红烧肉" → [0.8, 0.1, ...] ─┘

【查询阶段 - 每次动态生成查询向量】
问题A: "户外活动" → [0.12, 0.19, ...] → 匹配到日记1（散步）
问题B: "技术学习" → [0.48, 0.31, ...] → 匹配到日记2（Milvus）
问题C: "美食相关" → [0.79, 0.11, ...] → 匹配到日记3（红烧肉）
```

**关键理解**：
- 数据库里的向量是**固定的**（存入时生成一次）
- 用户每次提问会生成**新的查询向量**
- 用户问题不同 → 查询向量不同 → 匹配到的结果不同

### 语义检索 vs 传统模糊查询

| 对比 | MySQL 模糊查询 | Milvus 向量检索 |
|------|---------------|-----------------|
| 方式 | `LIKE '%关键词%'` | 语义相似度 |
| 查 "户外" | 只能匹配含"户外"的 | 能匹配"散步"、"爬山"、"公园" |
| 查 "开心" | 只能匹配含"开心"的 | 能匹配"愉快"、"高兴"、"心情好" |
| 智能程度 | 字符匹配（死的） | 语义理解（活的） |

### RAG 的本质

```
RAG = 检索增强生成

1. 向量数据库 = 你的"知识库"（存了什么就知道什么）
2. 检索 = 从知识库里找最相关的
3. LLM = 基于找到的内容生成回答
```

**重要**：如果知识库没有相关内容，LLM 只能说"我没找到相关信息"或者产生幻觉。所以做 RAG 应用，**数据质量和覆盖范围**很重要！

---

## 十、向量对比机制详解

### 数据库里存的是什么？

```
┌─────────────────────────────────────────────────────────────────┐
│                    Milvus 数据库                                 │
├─────────────────────────────────────────────────────────────────┤
│  ID          │  向量 (1024维)              │  原文            │
├─────────────────────────────────────────────────────────────────┤
│  diary_001   │  [0.012, 0.034, -0.056...]  │  今天去公园散步... │
│  diary_002   │  [0.089, -0.023, 0.067...]  │  学习了Milvus...   │
│  diary_003   │  [-0.045, 0.078, 0.012...]  │  今天加班很累...   │
│  diary_004   │  [0.023, 0.045, -0.034...]  │  和家人去爬山...   │
│  diary_005   │  [0.067, -0.012, 0.089...]  │  做了红烧肉...     │
└─────────────────────────────────────────────────────────────────┘

每条日记在存入时，都先经过 Embedding 模型生成向量
```

### 向量对比规则：余弦相似度

**使用余弦相似度 (Cosine Similarity)** 计算两个向量的相似程度。

```
                    查询向量
                       ↓
    [-0.0855, 0.0405, -0.0742, ...]  ← 你的问题
                       |
         ┌─────────────┼─────────────┐
         ↓             ↓             ↓
    日记1向量      日记2向量      日记3向量
         ↓             ↓             ↓
    计算夹角       计算夹角       计算夹角
         ↓             ↓             ↓
    相似度:0.89    相似度:0.72    相似度:0.65
         ↓
    返回相似度最高的
```

### 余弦相似度公式

```
                A · B
相似度 = ─────────────────
           ||A|| × ||B||

A · B = 两个向量的点积（对应位置相乘再求和）
||A|| = 向量的模（长度）

结果范围: -1 到 1
  1.0 = 完全相同
  0.0 = 完全无关
 -1.0 = 完全相反
```

### 实际计算示例

```javascript
// 问题向量 (假设只有3维简化示例)
const queryVector = [-0.08, 0.04, -0.07];

// 日记1向量
const diary1Vector = [-0.09, 0.05, -0.06];  // 语义相近

// 日记2向量  
const diary2Vector = [0.80, -0.20, 0.50];   // 语义不同

// 计算余弦相似度
// 问题 vs 日记1 → 0.99 (非常相似！向量方向接近)
// 问题 vs 日记2 → -0.85 (完全不同，向量方向相反)
```

### 完整检索流程

```
┌──────────────────────────────────────────────────────────────┐
│  用户问题: "我最近有什么开心的事？"                            │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  步骤1: Embedding 模型把问题转成向量                          │
│         [-0.0855, 0.0405, -0.0742, ...] (1024维)             │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  步骤2: 拿这个向量去 Milvus 里比对                            │
│                                                              │
│         查询向量 vs 日记1向量 → 余弦相似度 = 0.89             │
│         查询向量 vs 日记2向量 → 余弦相似度 = 0.72             │
│         查询向量 vs 日记3向量 → 余弦相似度 = 0.65             │
│         查询向量 vs 日记4向量 → 余弦相似度 = 0.88             │
│         查询向量 vs 日记5向量 → 余弦相似度 = 0.81             │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  步骤3: 返回相似度最高的 Top 3                                │
│                                                              │
│         1. 日记1 (0.89) - 今天去公园散步，心情很好            │
│         2. 日记4 (0.88) - 和家人去爬山，很开心                │
│         3. 日记5 (0.81) - 做了红烧肉，很满足                  │
└──────────────────────────────────────────────────────────────┘
```

### 为什么能匹配到语义相似的？

| 问题 | 日记内容 | 为什么匹配？ |
|------|---------|-------------|
| "开心的事" | "心情很好" | Embedding 模型知道这两个语义相近 |
| "开心的事" | "很开心" | 同上 |
| "户外活动" | "去公园散步" | 模型理解"散步"是一种户外活动 |

**Embedding 模型的训练数据**包含了大量文本，它学会了：
- "开心" ≈ "高兴" ≈ "愉快" ≈ "心情好"
- "户外" ≈ "公园" ≈ "散步" ≈ "爬山"

所以即使用户没有用完全相同的词，也能匹配到语义相关的内容！

---

## 十一、记忆要点

| 要点 | 说明 |
|------|------|
| **语义检索** | Milvus 用于语义检索，MySQL 用于精确查询 |
| **双写模式** | 一般同时写 MySQL 和 Milvus，保持数据同步 |
| **向量索引** | 向量字段必须建索引，用于快速检索 |
| **维度一致** | Schema 的 dim 必须与嵌入模型维度一致 |
| **嵌入模型** | 增、改、查都需要嵌入模型；删除按 ID 不需要 |
| **向量固定** | 数据库向量存入后固定，查询向量每次动态生成 |
| **余弦相似度** | 对比规则：计算两向量夹角，值越接近1越相似 |
| **简历加分项** | 可以围绕知识库、记忆模块展开聊 |

---

## 十二、Docker 常用命令

```bash
# 启动 Milvus
docker compose -f ./milvus-standalone-docker-compose.yml up -d

# 停止 Milvus
docker compose -f ./milvus-standalone-docker-compose.yml down

# 查看运行状态
docker ps

# 健康检查
curl http://localhost:9091/healthz
```
