import type { Question } from '../schemas/training';

export const seedQuestions: Question[] = [
  {
    id: 'q-agent-state-machine',
    tenantId: 'public',
    visibility: 'public',
    title: '如何设计一个可恢复的 Agent 面试状态机？',
    stem: '请说明 Agent 面试从 warmup 到 report_ready 的状态设计、持久化、失败恢复和审计方式。',
    type: 'system_design',
    difficulty: 'hard',
    tags: ['LangGraph', '状态机', '可观测性'],
    answer: '核心是显式阶段、checkpoint、幂等事件、结构化输出校验和 Product API 事实源。',
    rubric: [
      { point: '显式阶段', score: 3, description: '能列出面试阶段和状态转移条件。' },
      { point: '可恢复', score: 3, description: '能说明 checkpoint、幂等事件和重试。' },
      { point: '权限与审计', score: 2, description: '能说明工具授权和审计链路。' },
      {
        point: '观测评估',
        score: 2,
        description: '能说明 trace、prompt version、schema failure。',
      },
    ],
    sourceRefs: ['fixture://agent-interview-core'],
    status: 'published',
  },
  {
    id: 'q-rag-boundary',
    tenantId: 'public',
    visibility: 'public',
    title: 'RAG 在面试 Agent 中如何做权限过滤？',
    stem: '用户资料、公共题库和后台资料混合检索时，如何避免越权召回？',
    type: 'short_answer',
    difficulty: 'medium',
    tags: ['RAG', '权限', 'pgvector'],
    answer: '权限过滤必须在召回前约束数据作用域，召回后保留 sourceRefs 和 retrieval logs。',
    rubric: [
      { point: '召回前过滤', score: 4, description: '明确 tenant、owner、scope 过滤前置。' },
      { point: '来源追踪', score: 3, description: '保留 sourceRefs 和日志。' },
      { point: 'Agent 工具边界', score: 3, description: 'Agent 只能通过授权工具访问。' },
    ],
    sourceRefs: ['fixture://rag-permission'],
    status: 'published',
  },
];
