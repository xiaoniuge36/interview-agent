import {
  buildAgentChoiceQuestion,
  type AgentChoiceQuestionInput,
} from './public-agent-question-builders';

const AGENT_CAMP = 'https://github.com/yibo365/agent-camp';
const AGENT_STUDY = 'https://github.com/Callous-0923/agent-study';
const MICROSOFT_AGENTS = 'https://github.com/microsoft/ai-agents-for-beginners';
const OPENAI_COOKBOOK = 'https://github.com/openai/openai-cookbook';

const MULTIPLE_CHOICE_QUESTIONS: AgentChoiceQuestionInput[] = [
  {
    suffix: 'multiple-agent-safety',
    title: '生产环境工具型 Agent 应具备哪些安全控制？',
    stem: '请选择所有必要措施。',
    type: 'multiple_choice',
    difficulty: 'medium',
    options: [
      '工具白名单与最小权限',
      '执行前参数校验',
      '允许模型绕过租户过滤',
      '高风险操作确认与审计',
    ],
    correctOptionIds: ['A', 'B', 'D'],
    answer:
      'A、B、D。工具型 Agent 需要最小权限、严格参数校验、高风险确认和完整审计，模型不能绕过数据作用域。',
    tags: ['Agent 安全', '工具权限'],
    sourceRefs: [AGENT_STUDY, MICROSOFT_AGENTS],
  },
  {
    suffix: 'multiple-rag-metrics',
    title: '评估带引用的 RAG 系统时应关注哪些指标？',
    stem: '请选择所有合理指标。',
    type: 'multiple_choice',
    difficulty: 'medium',
    options: ['Recall@k', 'CSS 文件大小', 'Faithfulness', 'Citation Precision'],
    correctOptionIds: ['A', 'C', 'D'],
    answer:
      'A、C、D。召回率衡量能否找到证据，忠实度衡量答案是否受证据支持，引用精度衡量引用是否准确相关。',
    tags: ['RAG 评估', '指标'],
    sourceRefs: [AGENT_CAMP],
  },
  {
    suffix: 'multiple-context-budget',
    title: '哪些做法有助于控制 Agent 上下文预算？',
    stem: '请选择所有合理做法。',
    type: 'multiple_choice',
    difficulty: 'medium',
    options: [
      '裁剪与当前任务无关的信息',
      '摘要历史并保留关键事实',
      '压缩冗长工具结果',
      '始终注入全部原始日志',
    ],
    correctOptionIds: ['A', 'B', 'C'],
    answer:
      'A、B、C。上下文治理需要按相关性裁剪、摘要长期历史并折叠工具输出，而不是无差别注入全部日志。',
    tags: ['上下文工程', 'Token 预算'],
    sourceRefs: [AGENT_CAMP, AGENT_STUDY],
  },
  {
    suffix: 'multiple-multi-agent-fit',
    title: '哪些信号说明任务可能适合多 Agent？',
    stem: '请选择所有合理信号。',
    type: 'multiple_choice',
    difficulty: 'hard',
    options: [
      '存在边界清晰的专业角色',
      '子任务可独立或并行验证',
      '需要隔离不同上下文与工具权限',
      '任务只有一个简单确定性步骤',
    ],
    correctOptionIds: ['A', 'B', 'C'],
    answer:
      'A、B、C。多 Agent 适合可分工、可并行、需上下文或权限隔离的任务；简单确定性任务会被协作开销拖累。',
    tags: ['多 Agent', '架构选型'],
    sourceRefs: [AGENT_CAMP, MICROSOFT_AGENTS],
  },
  {
    suffix: 'multiple-retry-policy',
    title: '设计 Agent 工具重试策略时应包含哪些机制？',
    stem: '请选择所有合理机制。',
    type: 'multiple_choice',
    difficulty: 'medium',
    options: ['保证操作幂等或使用幂等键', '指数退避', '随机抖动避免惊群', '所有错误无限重试'],
    correctOptionIds: ['A', 'B', 'C'],
    answer:
      'A、B、C。安全重试依赖幂等、有限次数、指数退避和随机抖动；永久错误或达到预算后应降级或人工介入。',
    tags: ['可靠性', '重试'],
    sourceRefs: [AGENT_STUDY],
  },
  {
    suffix: 'multiple-observability',
    title: '一次 Agent 调用链应记录哪些可观测信息？',
    stem: '请选择所有合理信息。',
    type: 'multiple_choice',
    difficulty: 'medium',
    options: [
      'Trace/Span 与节点耗时',
      '模型、Prompt 版本与 Token 成本',
      '脱敏后的工具调用结果和错误',
      '用户密钥明文',
    ],
    correctOptionIds: ['A', 'B', 'C'],
    answer:
      'A、B、C。可观测数据应覆盖链路、版本、成本、工具和错误，同时严格脱敏，绝不能记录用户密钥明文。',
    tags: ['可观测性', 'Tracing'],
    sourceRefs: [AGENT_CAMP, AGENT_STUDY],
  },
  {
    suffix: 'multiple-prompt-injection',
    title: '哪些措施可以降低间接 Prompt Injection 风险？',
    stem: '请选择所有合理措施。',
    type: 'multiple_choice',
    difficulty: 'hard',
    options: [
      '把检索内容视为不可信数据',
      '分离系统指令与外部内容',
      '对工具采用最小权限和参数策略',
      '执行网页中要求泄露凭证的隐藏指令',
    ],
    correctOptionIds: ['A', 'B', 'C'],
    answer:
      'A、B、C。外部内容必须按不可信数据处理，和系统指令隔离，并通过最小权限工具策略限制潜在影响。',
    tags: ['Prompt Injection', 'Agent 安全'],
    sourceRefs: [AGENT_CAMP, MICROSOFT_AGENTS],
  },
  {
    suffix: 'multiple-structured-output',
    title: '提升模型结构化输出可靠性应采用哪些措施？',
    stem: '请选择所有合理措施。',
    type: 'multiple_choice',
    difficulty: 'medium',
    options: [
      '使用严格 Schema 或工具协议',
      '服务端再次校验输出',
      '失败时有限重试并提供校验错误',
      '只靠正则从任意自然语言中猜字段',
    ],
    correctOptionIds: ['A', 'B', 'C'],
    answer:
      'A、B、C。应优先使用结构约束，再做服务端校验和有限纠错重试；正则猜测不能替代结构化协议。',
    tags: ['结构化输出', '可靠性'],
    sourceRefs: [OPENAI_COOKBOOK, AGENT_CAMP],
  },
];

export const PUBLIC_AGENT_MULTIPLE_CHOICE_QUESTIONS =
  MULTIPLE_CHOICE_QUESTIONS.map(buildAgentChoiceQuestion);
