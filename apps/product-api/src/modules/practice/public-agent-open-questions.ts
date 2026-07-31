import {
  buildAgentOpenQuestion,
  type AgentOpenQuestionInput,
} from './public-agent-question-builders';

const AGENT_CAMP = 'https://github.com/yibo365/agent-camp';
const AGENT_HUB = 'https://github.com/Zchary1106/agent-interview-hub';
const AGENT_STUDY = 'https://github.com/Callous-0923/agent-study';
const AI_GUIDE = 'https://github.com/guocong-bincai/ai-interview-guide';
const AI_HANDBOOK = 'https://github.com/nageoffer/ai-handbook';
const OPENAI_COOKBOOK = 'https://github.com/openai/openai-cookbook';

const OPEN_QUESTIONS: AgentOpenQuestionInput[] = [
  {
    suffix: 'open-multitenant-rag',
    title: '设计一个多租户企业知识库 RAG 平台',
    stem: '请说明文档摄取、切分与索引、租户和文档权限过滤、混合检索、引用生成、评估与审计链路。',
    type: 'system_design',
    difficulty: 'expert',
    answer:
      '写入侧按租户和权限建立可追溯索引；查询侧在召回前强制作用域过滤，再做混合召回与重排；生成必须携带引用，并以离线集、线上反馈和审计日志形成闭环。',
    tags: ['RAG', '多租户', '系统设计'],
    points: ['权限前置过滤', '检索生成链路', '评估审计闭环'],
    sourceRefs: [AI_GUIDE, AI_HANDBOOK],
  },
  {
    suffix: 'open-loop-termination',
    title: 'Agent Loop 应如何设计停止条件？',
    stem: '请比较任务完成、最大步数、时间或 Token 预算、重复动作检测和人工接管，并说明优先级。',
    type: 'short_answer',
    difficulty: 'medium',
    answer:
      '正常路径由可验证的任务完成信号停止；安全护栏同时限制步数、时间和 Token，并检测重复动作。无法恢复或涉及高风险决策时转人工，不让模型自行无限循环。',
    tags: ['Agent Loop', '终止条件'],
    points: ['完成信号', '资源预算', '异常兜底'],
    sourceRefs: [AGENT_CAMP, AGENT_STUDY],
  },
  {
    suffix: 'open-mcp-function-boundary',
    title: 'MCP 与单模型 Function Calling 的边界是什么？',
    stem: '请从协议范围、能力发现、生命周期、传输、工具与资源复用、适用场景说明二者关系。',
    type: 'short_answer',
    difficulty: 'hard',
    answer:
      'Function Calling 主要描述模型如何输出一次结构化工具请求；MCP 进一步标准化客户端与服务端之间的能力发现、生命周期和 Tools/Resources/Prompts 交互。简单应用可只用 Function Calling，跨客户端复用和独立工具服务更适合 MCP。',
    tags: ['MCP', 'Function Calling'],
    points: ['协议层次', '能力生命周期', '场景取舍'],
    sourceRefs: [AI_HANDBOOK, AGENT_STUDY],
  },
  {
    suffix: 'open-state-recovery',
    title: '如何设计可恢复、可审计的 Agent 状态机？',
    stem: '请说明状态、事件、幂等、checkpoint、重试与补偿、人工介入和版本并发控制。',
    type: 'system_design',
    difficulty: 'hard',
    answer:
      '用显式状态和事件定义合法转移，以业务数据库作为事实源；节点执行携带幂等键并保存 checkpoint，失败按错误类型重试或补偿；高风险节点可暂停等待人工确认，写入使用版本号防止并发覆盖。',
    tags: ['状态机', '失败恢复', '审计'],
    points: ['显式状态转移', '幂等恢复', '并发与审计'],
    sourceRefs: [AGENT_HUB, AGENT_CAMP],
  },
  {
    suffix: 'open-model-router',
    title: '设计一个兼顾质量、时延与成本的模型路由器',
    stem: '请说明任务分级、模型选择、降级与回退、预算限制、质量评估和路由策略迭代。',
    type: 'system_design',
    difficulty: 'hard',
    answer:
      '先按任务风险和复杂度定义质量门槛，再通过规则或轻量分类器路由模型；失败时有限重试并按兼容性降级。每次调用记录质量、时延、Token 和成本，以离线评测和线上反馈更新阈值。',
    tags: ['模型路由', '成本优化'],
    points: ['任务分级', '降级预算', '数据驱动迭代'],
    sourceRefs: [AGENT_STUDY, AI_GUIDE],
  },
  {
    suffix: 'open-stream-tool-parser',
    title: '实现流式 Tool Calling 参数组装器',
    stem: '请设计核心数据结构或伪代码：模型会分片返回多个 tool call 的 id、name 和 arguments，要求支持交错到达、UTF-8 边界、完成校验与异常清理。',
    type: 'coding',
    difficulty: 'expert',
    answer:
      '以 choice/tool-call index 或稳定 id 建立累加状态，分别拼接 name 与 arguments 字节流；完成事件到达后再做 UTF-8 解码和 JSON Schema 校验。缺片、重复完成或非法 JSON 必须产生结构化错误并清理对应状态，不能直接执行半成品参数。',
    tags: ['Tool Calling', 'Streaming', '代码题'],
    points: ['分片状态管理', '完成后校验', '异常与清理'],
    sourceRefs: [AGENT_STUDY, OPENAI_COOKBOOK],
  },
  {
    suffix: 'open-rag-evaluation',
    title: '如何建立 RAG 质量评估与故障定位闭环？',
    stem: '请从评测集构造、召回指标、重排、忠实度、引用、线上失败样本和回归门禁展开。',
    type: 'project_deep_dive',
    difficulty: 'hard',
    answer:
      '从真实查询和边界问题构造带黄金证据的评测集，分层测 Recall@k、重排质量、答案忠实度和引用精度；线上采集脱敏失败样本并归因到摄取、召回、重排或生成，修复后进入固定回归集和发布门禁。',
    tags: ['RAG 评估', 'Golden Set'],
    points: ['分层指标', '失败归因', '回归门禁'],
    sourceRefs: [AGENT_CAMP, AI_GUIDE],
  },
  {
    suffix: 'open-multi-agent-tradeoff',
    title: '什么时候不应该使用多 Agent？',
    stem: '请结合协作开销、上下文共享、错误传播、可观测性和任务可分解性给出判断框架。',
    type: 'short_answer',
    difficulty: 'medium',
    answer:
      '任务不可自然分解、共享状态高度耦合、单模型已能稳定完成或协作成本超过收益时，不应引入多 Agent。应先用确定性 workflow 或单 Agent 建基线，再用任务完成率、时延和成本证明多 Agent 的增益。',
    tags: ['多 Agent', '架构取舍'],
    points: ['准入条件', '协作风险', '基线验证'],
    sourceRefs: [AGENT_CAMP, AGENT_STUDY],
  },
  {
    suffix: 'open-memory-architecture',
    title: '设计 Agent 的短期记忆与长期记忆体系',
    stem: '请说明会话窗口、摘要、事实与偏好存储、写入门禁、检索排序、过期删除和用户可控性。',
    type: 'system_design',
    difficulty: 'hard',
    answer:
      '短期记忆保留当前任务所需消息并按预算摘要；长期记忆只写入经过来源和置信度校验的事实、偏好或能力证据。检索结合相关性、时效和权限，敏感信息设过期与删除能力，用户可查看、修正和关闭记忆。',
    tags: ['Agent Memory', '上下文工程'],
    points: ['记忆分层', '写入检索门禁', '隐私生命周期'],
    sourceRefs: [AGENT_CAMP, AGENT_STUDY],
  },
  {
    suffix: 'open-injection-incident',
    title: '如何处置一次间接 Prompt Injection 事件？',
    stem: '假设 Agent 读取网页后尝试调用高权限工具，请说明止损、取证、根因、修复与回归验证。',
    type: 'behavioral',
    difficulty: 'hard',
    answer:
      '立即阻断高风险工具和受影响会话，保留脱敏 trace、输入来源与策略版本；确认外部内容如何越过指令边界和权限校验，修复最小权限、内容隔离与确认门禁，并把攻击样本加入安全回归集。',
    tags: ['Prompt Injection', '安全事件'],
    points: ['快速止损', '根因取证', '修复回归'],
    sourceRefs: [AGENT_CAMP, AGENT_STUDY],
  },
  {
    suffix: 'open-agent-tracing',
    title: '如何设计可定位单次失败的 Agent Trace？',
    stem: '请说明 trace/span 层级、模型与 Prompt 版本、工具调用、Token 成本、状态转移、隐私脱敏和关联查询。',
    type: 'system_design',
    difficulty: 'hard',
    answer:
      '一个用户任务对应 trace，各模型、检索、工具和状态节点形成 span；记录版本、时延、Token、错误码和状态转移，用 request/session/item ID 关联业务事实。输入输出按策略脱敏或摘要化，密钥和敏感原文禁止落日志。',
    tags: ['可观测性', 'Tracing'],
    points: ['链路建模', '业务关联', '隐私与成本'],
    sourceRefs: [AGENT_CAMP, AGENT_STUDY],
  },
  {
    suffix: 'open-semantic-cache',
    title: '设计一个安全的 LLM 语义缓存',
    stem: '请给出 key、相似度阈值、租户与权限隔离、时效性、失效策略、命中验证和敏感数据处理方案。',
    type: 'coding',
    difficulty: 'expert',
    answer:
      '缓存 key 应包含租户、权限范围、模型与 Prompt 版本以及规范化请求；仅在语义相似度和业务约束同时满足时命中。结果设置 TTL、数据版本和主动失效，敏感请求默认禁用或加密，并持续抽样验证命中正确率。',
    tags: ['语义缓存', '成本优化', '安全'],
    points: ['缓存键与隔离', '命中与失效', '安全验证'],
    sourceRefs: [AGENT_STUDY, OPENAI_COOKBOOK],
  },
];

export const PUBLIC_AGENT_OPEN_QUESTIONS = OPEN_QUESTIONS.map(buildAgentOpenQuestion);
