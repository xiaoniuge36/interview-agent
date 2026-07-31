---
title: RAG 与 Agentic RAG
date: 2026-07-29
tags: [RAG, Hybrid Search, Reranker, Agentic RAG, 评估]
kind: course
track: AI Agent 工程师完整路线
order: 3
level: intermediate
duration: 105
summary: 用检索链路、消融实验和质量指标构建可诊断的知识增强系统
---

# RAG 与 Agentic RAG

RAG 的价值不是“接了向量数据库”，而是让回答能够基于可更新、可授权、可追溯的证据。高质量 RAG 首先是一套信息检索系统，其次才是生成系统。

## 学习目标

- 掌握离线索引和在线查询的完整链路。
- 理解 Chunk、Metadata、Embedding、Hybrid Search 和 Reranker 的取舍。
- 能用实验区分检索失败与生成失败。
- 判断什么时候需要 Agentic RAG，什么时候简单管线更可靠。

## RAG 全链路

```text
离线：解析 → 清洗 → 结构化切分 → 元数据/权限 → Embedding → 索引 → 版本
在线：查询理解 → 权限过滤 → 多路召回 → 融合 → 重排 → 上下文组装
      → 带引用生成 → 答案/证据校验 → 日志与反馈
```

### 文档解析与切分

固定字符切分容易截断表格、代码和章节关系。优先利用标题、段落、表格和语义边界，再根据查询类型决定 Chunk 大小和重叠。保留 `sourceId`、章节、页码、时间、租户、权限、版本和内容哈希。

### Embedding 与向量库

模型选择要看目标语言、领域、维度、延迟和更新成本。索引必须记录 embedding 模型与版本；升级模型时旧向量不可与新向量静默混用。向量数据库的选择要结合过滤能力、更新频率、数据规模和运维条件，而不只是 ANN 算法名称。

### Hybrid Search 与重排

关键词检索擅长专有名词、编号和精确条件，向量检索擅长语义改写。常见流程是各取 top N，经 RRF 或归一化融合后交给 Reranker，再选择最终 top K。

权限过滤应在召回前生效；如果先取全局 top K 再过滤，既可能泄露信息，也可能让合法结果全部被挤掉。

## 查询理解

- 多轮追问先结合会话状态重写为独立查询。
- 对复杂问题做子问题分解，但限制分支数量。
- HyDE、Step-back 等方法应通过固定评测集决定是否启用。
- 无法判断用户意图时先澄清，不要用更多检索掩盖输入模糊。

## 生成与引用

上下文应明确标注来源边界，要求模型只根据证据回答；证据不足时允许拒答。引用必须指向真实 sourceId 和片段，不能让模型自由编造 URL。生成后可检查每个关键陈述是否有证据支持。

## 怎样定位 RAG 故障

### Golden Document 实验

把正确文档直接提供给生成模型：若答案仍错，问题在 Prompt、上下文组装或模型；若答案正确，问题在检索。

### Retrieval Ablation

依次比较关键词、向量、混合、重排，保持其他变量不变。记录 Recall@K、MRR、nDCG、延迟和成本，避免“同时改五个参数后感觉更好”。

### 失败分类

- 解析失败：源信息未进入索引。
- 分块失败：答案跨 Chunk 或结构丢失。
- 召回失败：正确 Chunk 不在候选集。
- 重排失败：正确 Chunk 被错误降权。
- 组装失败：证据被截断或顺序干扰。
- 生成失败：忽略证据、错误归纳或伪造引用。

## Agentic RAG

当系统需要决定是否检索、选择不同数据源、查询改写、验证证据并根据结果重试时，可以引入 Agent。若数据源单一、查询稳定且延迟敏感，确定性 RAG 管线通常更好。

Agentic RAG 必须限制最大检索次数、允许无证据拒答、记录每次查询与命中，并保留普通 RAG 或规则回退。

## 本课动手实验

准备 30–50 个小文档和至少 15 个查询，包含可回答、部分可回答、不可回答三类：

1. 实现关键词和向量两条召回。
2. 用 RRF 合并并加入一个 Reranker。
3. 保存 query、候选、分数、最终上下文和引用。
4. 分别计算 Recall@5、MRR、回答忠实度、P95 延迟。
5. 对三条失败样例执行 Golden Document 实验。
6. 只在评测证明有效时加入查询重写或 Agentic 重试。

## 自测

1. 为什么 Chunk 越大不一定越好？
2. 为什么有向量检索仍需要关键词检索？
3. 过滤后 top K 与过滤前 top K 有什么本质区别？
4. 如何证明 Agentic RAG 比普通 RAG 值得增加的复杂度？

## 面试怎么讲

按“离线索引—在线召回—重排—生成—评估”讲完整链路，再拿一个失败样例说明如何通过 Golden Document 和消融定位。面试官真正关注的是你是否能诊断和量化，而不是记住多少 RAG 名词。

## 延伸来源

- [ai-handbook](https://github.com/nageoffer/ai-handbook)：从解析、Chunk、Metadata 到混合检索、重排和评估的完整链路。
- [MisterBooo/llm-interview-questions](https://github.com/MisterBooo/llm-interview-questions)：RAG、向量检索、重排与失败诊断图解。
- [awesome-llm-apps](https://github.com/Shubhamsaboo/awesome-llm-apps)：Corrective RAG、Hybrid Search、GraphRAG 和诊断案例。
- [Hugging Face Agents Course](https://github.com/huggingface/agents-course)：Agentic RAG 单元与最终评测项目。
