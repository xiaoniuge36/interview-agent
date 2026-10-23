---
title: "第14章：Prompt Template 组件化管理 prompt"
date: 2026-10-22
tags: [外部资料, PromptTemplate, Prompt]
kind: reference
track: 外部资料
source: ai-god-learn/学习笔记/12-PromptTemplate/README.md
---

# 第14章：Prompt Template 组件化管理 prompt

## 核心概念

Prompt Template 用于组件化管理 prompt，将 prompt 拆分成可复用的模块，动态填充变量。

```
┌─────────────────────────────────────────────────────────────────┐
│                    Prompt Template 体系                          │
├──────────────────────────┬──────────────────────────────────────┤
│      基础模板             │         示例管理                      │
│  (Prompt Template)       │    (Example Selector)                │
├──────────────────────────┼──────────────────────────────────────┤
│ • PromptTemplate         │ • FewShotPromptTemplate              │
│ • ChatPromptTemplate     │ • FewShotChatMessagePromptTemplate   │
│ • PipelinePromptTemplate │ • LengthBasedExampleSelector         │
│ • MessagesPlaceholder    │ • SemanticSimilarityExampleSelector   │
└──────────────────────────┴──────────────────────────────────────┘
```

## API 全景

### 1. PromptTemplate - 基础模板

用占位符 `{variable}` 定义模板，`format()` 填充变量。

```javascript
import { PromptTemplate } from '@langchain/core/prompts';

const template = PromptTemplate.fromTemplate(`
公司：{company_name}
部门：{team_name}
请生成周报。
`);

const prompt = await template.format({
  company_name: '星航科技',
  team_name: 'AI 平台组',
});
```

### 2. PipelinePromptTemplate - 组合多个模板

将 prompt 按角色、背景、任务、格式等拆分，复用时再组合。

```javascript
import { PipelinePromptTemplate, PromptTemplate } from '@langchain/core/prompts';

// 各模块独立维护
const personaPrompt = PromptTemplate.fromTemplate(`你是{tone}风格的团队负责人。`);
const contextPrompt = PromptTemplate.fromTemplate(`公司：{company_name}，部门：{team_name}`);
const taskPrompt = PromptTemplate.fromTemplate(`本周数据：{dev_activities}`);
const formatPrompt = PromptTemplate.fromTemplate(`请用 Markdown 输出，符合{company_values}。`);

// 最终组合
const finalPrompt = PromptTemplate.fromTemplate(
  `{persona_block}\n{context_block}\n{task_block}\n{format_block}\n请生成周报：`
);

const pipeline = new PipelinePromptTemplate({
  pipelinePrompts: [
    { name: 'persona_block', prompt: personaPrompt },
    { name: 'context_block', prompt: contextPrompt },
    { name: 'task_block', prompt: taskPrompt },
    { name: 'format_block', prompt: formatPrompt },
  ],
  finalPrompt,
});
```

**优势**：每部分可独立维护、跨场景复用（如周报 / 季度 OKR 复用同一个 personaPrompt）。

### 3. partial - 预填充变量

```javascript
const partialTemplate = await pipeline.partial({
  company_name: '星航科技',
  tone: '专业但不僵硬',
});
// 后续只需填入剩余变量
const result = await partialTemplate.format({ team_name: 'AI组', ... });
```

### 4. ChatPromptTemplate - messages 数组形式

实际开发中最常用，因为调用大模型用的是 messages 数组。

```javascript
import { ChatPromptTemplate } from '@langchain/core/prompts';

// 方式1：二维数组
const chatPrompt = ChatPromptTemplate.fromMessages([
  ['system', '你是{tone}风格的助手。'],
  ['human', '请帮我写周报：{dev_activities}'],
]);

// 方式2：使用具体 MessagePromptTemplate
import { SystemMessagePromptTemplate, HumanMessagePromptTemplate } from '@langchain/core/prompts';

const systemTemplate = SystemMessagePromptTemplate.fromTemplate('...');
const humanTemplate = HumanMessagePromptTemplate.fromTemplate('...');
const composed = ChatPromptTemplate.fromMessages([systemTemplate, humanTemplate]);
```

### 5. MessagesPlaceholder - 插入对话历史

```javascript
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';

const chatPrompt = ChatPromptTemplate.fromMessages([
  ['system', '你是一名工程效率顾问。'],
  new MessagesPlaceholder('history'),  // 插入多轮对话历史
  ['human', '{current_input}'],
]);

const result = await chatPrompt.formatPromptValue({
  history: [
    { role: 'human', content: '我们在做周报工具。' },
    { role: 'ai', content: '建议先梳理数据源。' },
  ],
  current_input: '有什么优化建议？',
});
```

### 6. FewShotPromptTemplate - 少量示例

```javascript
import { FewShotPromptTemplate, PromptTemplate } from '@langchain/core/prompts';

const examplePrompt = PromptTemplate.fromTemplate(
  `用户输入：{user_requirement}\n示例输出：{report_snippet}\n---`
);

const examples = [
  { user_requirement: '稳定性治理', report_snippet: '处理 P1 Bug 2 个...' },
  { user_requirement: '展示亮点', report_snippet: '上线实时看板...' },
];

const fewShot = new FewShotPromptTemplate({
  examples,
  examplePrompt,
  prefix: '参考以下示例：',
  suffix: '请为下面场景写周报：{current_requirement}',
  inputVariables: ['current_requirement'],
});
```

### 7. ExampleSelector - 示例选择器

| Selector | 原理 | 适用场景 |
|----------|------|---------|
| `LengthBasedExampleSelector` | 根据字符/token 长度选择 | 控制 token 消耗 |
| `SemanticSimilarityExampleSelector` | 向量相似度匹配 | 选语义最相关的示例 |

```javascript
// 按长度选择
const selector = await LengthBasedExampleSelector.fromExamples(examples, {
  examplePrompt,
  maxLength: 700,
  getTextLength: (text) => text.length,
});

// 按语义选择（基于 Milvus）
const selector = new SemanticSimilarityExampleSelector({
  vectorStore,  // Milvus 向量库
  k: 2,         // 选最相近的 2 条
});
```

### 8. FewShotChatMessagePromptTemplate - 对话形式示例

```javascript
import { FewShotChatMessagePromptTemplate, ChatPromptTemplate } from '@langchain/core/prompts';

const fewShotExamples = new FewShotChatMessagePromptTemplate({
  examplePrompt: ChatPromptTemplate.fromMessages([
    ['human', '工作概述：{input}'],
    ['ai', '{output}'],
  ]),
  examples: [
    { input: '推进支付稳定性', output: '- 完成 P1 事故修复...' },
  ],
  inputVariables: [],
});
```

## 关键代码速查

```javascript
// PromptTemplate - 基础
const prompt = await PromptTemplate.fromTemplate("你好{name}").format({ name: "神光" });

// ChatPromptTemplate - 最常用
const messages = await ChatPromptTemplate.fromMessages([
  ['system', '{role}'], ['human', '{question}']
]).formatMessages({ role: '助手', question: '你好' });

// PipelinePromptTemplate - 组合复用
new PipelinePromptTemplate({ pipelinePrompts: [...], finalPrompt });

// partial - 预填充
const partial = await template.partial({ company: '星航' });

// MessagesPlaceholder - 插入对话历史
new MessagesPlaceholder('history');

// FewShotPromptTemplate - 示例管理
new FewShotPromptTemplate({ examples, examplePrompt, prefix, suffix });

// ExampleSelector - 按长度 / 语义选择示例
LengthBasedExampleSelector / SemanticSimilarityExampleSelector
```

## 企业应用场景

| 场景 | 技术 | 说明 |
|------|------|------|
| 周报/OKR 生成 | PipelinePromptTemplate | 拆分人设/背景/任务/格式，跨场景复用 |
| 多轮对话 | ChatPromptTemplate + MessagesPlaceholder | 插入对话历史 |
| 智能客服 | FewShotPromptTemplate | 用示例引导模型回答风格 |
| RAG 问答 | ChatPromptTemplate | 把检索结果嵌入 prompt |
| 个性化推荐 | partial | 预填用户画像，动态填业务数据 |
| 语义示例选择 | SemanticSimilarityExampleSelector + Milvus | 根据场景自动选最相关示例 |

## 学习文件

| 文件 | 内容 |
|------|------|
| `学习文档/14.Prompt Template：组件化管理 prompt.md` | 原始课程文档 |
| `ai-agent-course-code-learn/prompt-template-test/` | 学习代码 |
| `ai-agent-course-code/prompt-template-test/` | 课程原始代码 |
