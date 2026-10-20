import {
  buildAgentOpenQuestion,
  type AgentOpenQuestionInput,
} from './public-agent-question-builders';

const GRAPH_API = 'https://docs.langchain.com/oss/python/langgraph/graph-api';
const PERSISTENCE = 'https://docs.langchain.com/oss/python/langgraph/persistence';
const INTERRUPTS = 'https://docs.langchain.com/oss/python/langgraph/interrupts';
const STREAMING = 'https://docs.langchain.com/oss/python/langgraph/streaming';
const LANGCHAIN_AGENTS = 'https://docs.langchain.com/oss/python/langchain/agents';
const STRUCTURED_OUTPUT = 'https://docs.langchain.com/oss/python/langchain/structured-output';
const LANGGRAPH_OVERVIEW = 'https://docs.langchain.com/oss/python/langgraph/overview';
const EFFECTIVE_AGENTS = 'https://www.anthropic.com/engineering/building-effective-agents';
const CONTEXT_ENGINEERING =
  'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents';
const AGENT_EVALS = 'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents';
const REACT_PAPER = 'https://arxiv.org/abs/2210.03629';

const QUESTIONS: AgentOpenQuestionInput[] = [
  {
    suffix: 'framework-recursion-limit',
    title: 'recursion_limit 如何防止 Agent 无限循环？',
    stem: '区分图步骤上限与任务完成判定；若模型反复选择同一个工具，还需要哪些限制和恢复出口？',
    type: 'short_answer',
    difficulty: 'hard',
    answer:
      'recursion_limit 限制图执行步数，是最后一道运行护栏，不代表任务完成。还要设置最大工具调用次数、Token/时间预算、重复动作检测和明确的完成条件；触限时记录轨迹并返回可处理的失败或转人工。',
    tags: ['LangGraph', 'Agent Loop', '终止条件'],
    points: ['步骤上限语义', '业务终止信号', '预算与兜底'],
    sourceRefs: [GRAPH_API, EFFECTIVE_AGENTS],
  },
  {
    suffix: 'framework-interrupt-replay',
    title: 'Interrupt 恢复时哪些代码可能重跑？',
    stem: '节点在发送审批前调用外部 API，随后 interrupt；恢复时有什么风险，如何保证只执行一次业务动作？',
    type: 'system_design',
    difficulty: 'expert',
    answer:
      '恢复通常会从包含 interrupt 的节点开头重新执行，故中断前的外部调用可能重复。把副作用移到审批之后或独立任务，用稳定幂等键与业务库记录执行状态；以相同 thread_id 和 Command(resume=...) 继续，并测试进程重启场景。',
    tags: ['LangGraph', 'Interrupt', '幂等'],
    points: ['节点重放机制', '副作用隔离', '恢复测试'],
    sourceRefs: [INTERRUPTS],
  },
  {
    suffix: 'framework-pending-writes',
    title: 'Checkpoint 的 super-step 一致性与 pending writes 如何工作？',
    stem: '同一 super-step 的两个节点中，一个成功一个失败；恢复时哪些写入可复用，为什么仍不能宣称外部副作用恰好执行一次？',
    type: 'short_answer',
    difficulty: 'expert',
    answer:
      '完整 checkpoint 位于 super-step 边界；同一步中成功节点的 pending writes 可被持久保存，兄弟节点失败后恢复可复用这些写入。它不涵盖外部服务写入与 checkpoint 的原子性，进程故障窗口仍可能导致重放，因此副作用需单独做幂等。',
    tags: ['LangGraph', 'Checkpoint', 'pending writes'],
    points: ['checkpoint 边界', 'pending writes 恢复', '外部副作用限制'],
    sourceRefs: [PERSISTENCE],
  },
  {
    suffix: 'framework-memory-scopes',
    title: '短期记忆、长期记忆与 thread_id 如何分层？',
    stem: '设计同一用户跨会话的偏好记忆：图内状态和跨线程 Store 各保存什么，如何划分 namespace 与 TTL？',
    type: 'system_design',
    difficulty: 'hard',
    answer:
      'checkpointer 按 thread_id 保存当前任务的状态与会话历史；Store 用独立 namespace 保存跨线程可复用的长期事实或偏好。namespace 绑定租户和用户，写入需验证来源与时效，读取需授权，并提供更正、过期和删除路径。',
    tags: ['LangGraph', 'Agent Memory', '权限'],
    points: ['线程内与跨线程存储', 'namespace 隔离', '记忆生命周期'],
    sourceRefs: [PERSISTENCE, CONTEXT_ENGINEERING],
  },
  {
    suffix: 'framework-streaming-modes',
    title: 'LangGraph 的 streaming 模式有什么区别？',
    stem: '比较 values、updates、messages、custom、debug 事件；前端展示模型回复、节点进度和审计信息应分别消费什么？',
    type: 'short_answer',
    difficulty: 'hard',
    answer:
      'values 提供步骤后的状态快照，updates 提供节点增量，messages 输出模型 token 与元数据，custom 输出应用自定义事件，debug 面向排障。前端按需求订阅并过滤事件，尤其不能把完整状态或 debug 数据直接暴露给用户。',
    tags: ['LangGraph', 'Streaming', '前端集成'],
    points: ['各模式的数据粒度', '按 UI 需求选流', '敏感状态过滤'],
    sourceRefs: [STREAMING, GRAPH_API],
  },
  {
    suffix: 'framework-react-plan-reflect',
    title: 'ReAct、Plan-and-Execute、Reflexion 如何选？',
    stem: '比较逐步观察后行动、先规划后执行和反思纠错在未知环境、长任务、成本与可控性上的权衡。',
    type: 'short_answer',
    difficulty: 'hard',
    answer:
      'ReAct 适合需要频繁根据工具观察调整动作的任务；Plan-and-Execute 把全局分解与局部执行分开，适合较长任务但计划可能过时；反思步骤可用于可验证的失败修正，但会增加调用成本。选择前先建立任务成功率、时延和成本基线。',
    tags: ['ReAct', '规划', 'Agent 架构'],
    points: ['三种控制策略', '场景和失败模式', '质量成本基线'],
    sourceRefs: [REACT_PAPER, EFFECTIVE_AGENTS],
  },
  {
    suffix: 'framework-implement-react-loop',
    title: '不用框架如何手写一个 ReAct Agent？',
    stem: '写出模型与工具交替循环的伪代码，涵盖消息历史、工具参数校验、错误回填、终止条件和上下文压缩。',
    type: 'coding',
    difficulty: 'hard',
    answer:
      '维护 messages、可用工具表和预算；每轮调用模型，若得到最终答案则结束，否则按 tool_call_id 校验并执行工具，将结果或错误追加为工具消息，再进入下一轮。超过步数/时间/Token 预算要停止；上下文接近上限时保留系统指令、关键证据和未完成调用，压缩旧对话。',
    tags: ['ReAct', 'Agent Loop', 'Tool Calling'],
    points: ['模型工具循环', '错误和终止', '上下文治理'],
    sourceRefs: [REACT_PAPER, CONTEXT_ENGINEERING],
  },
  {
    suffix: 'framework-memory-design',
    title: 'Agent 的短期记忆和长期记忆如何设计？',
    stem: '比较原始消息、摘要、结构化事实和向量记忆的适用范围；如何避免错误记忆跨会话传播？',
    type: 'system_design',
    difficulty: 'hard',
    answer:
      '短期保留当前目标、最近交互和关键工具结果，按窗口预算压缩历史；长期只存可验证的事实与偏好，附来源、时间和置信度。检索时做权限、相关性和时效过滤；支持用户更正与删除，不能把模型猜测直接写成长期事实。',
    tags: ['Agent Memory', '上下文工程', '安全'],
    points: ['短期上下文压缩', '长期写入门禁', '检索与纠错'],
    sourceRefs: [CONTEXT_ENGINEERING, PERSISTENCE],
  },
  {
    suffix: 'framework-evaluate-trajectory',
    title: 'Agent 应该评估最终答案还是整条执行轨迹？',
    stem: '设计评测集和指标，覆盖任务成功率、工具选择、无效循环、证据引用、安全行为、时延与成本。',
    type: 'system_design',
    difficulty: 'hard',
    answer:
      '同时评估结果和轨迹：正确答案可能来自错误工具或越权检索，安全轨迹也可能未完成任务。使用带预期证据、可接受动作和禁止动作的样本，分层记录成功率、工具准确率、步骤数、引用质量、安全违规、时延和成本，并审查失败样本。',
    tags: ['Agent 评估', '轨迹评估', '安全'],
    points: ['结果与过程双层指标', '可复现评测样本', '失败归因'],
    sourceRefs: [AGENT_EVALS],
  },
  {
    suffix: 'framework-framework-selection',
    title: 'LangGraph、CrewAI、AutoGen 如何选型？',
    stem: '给出一个能验证的选型方法，比较状态恢复、人工审批、多角色协作、工程可控性、学习成本与维护成本。',
    type: 'short_answer',
    difficulty: 'hard',
    answer:
      '先选同一业务样例和验收指标，再分别实现最小原型，测试状态恢复、权限隔离、人工审批、多角色协作、可观测性、时延和成本。若单工作流已满足需求，不应仅因框架支持多 Agent 而增加多角色；最终选择应由测试数据和团队维护能力决定。',
    tags: ['框架选型', 'LangGraph', '多 Agent'],
    points: ['统一业务样例', '能力和成本比较', '证据驱动决策'],
    sourceRefs: [LANGGRAPH_OVERVIEW, EFFECTIVE_AGENTS],
  },
  {
    suffix: 'framework-production-retries',
    title: '生产 Agent 的重试、超时和补偿怎么设计？',
    stem: '对模型超时、限流、工具参数错误和外部写入已成功但响应丢失分别制定策略。',
    type: 'system_design',
    difficulty: 'expert',
    answer:
      '限流和短暂网络故障可在预算内退避重试；参数错误应校验并有限反馈模型修正；不可恢复错误直接停止。外部写入应以幂等键查询/对账，响应丢失不能盲目重放；补偿需要明确逆操作与审计。所有节点设超时、总预算和人工接管出口。',
    tags: ['生产可靠性', '重试', '幂等'],
    points: ['错误分类和退避', '副作用对账补偿', '总预算和人工出口'],
    sourceRefs: [INTERRUPTS, EFFECTIVE_AGENTS],
  },
  {
    suffix: 'framework-shared-state-vs-messages',
    title: '多 Agent 共享 State 还是使用消息传递？',
    stem: '比较共享状态与 handoff 消息在耦合度、权限边界、上下文损失和并发写入上的风险。',
    type: 'system_design',
    difficulty: 'hard',
    answer:
      '共享 State 便于同图协作，但要控制字段所有权、reducer 和敏感信息访问；消息传递以显式契约交接任务，隔离更清晰，但必须携带足够的目标、证据和状态摘要。按任务耦合度与安全域选择，并对并发冲突和上下文丢失做测试。',
    tags: ['多 Agent', 'State', 'Handoff'],
    points: ['两种状态模型', '权限和并发约束', '交接信息完整性'],
    sourceRefs: [GRAPH_API, EFFECTIVE_AGENTS],
  },
  {
    suffix: 'framework-agent-harness',
    title: 'LangChain Agent 的 model 与 harness 分别负责什么？',
    stem: '解释模型决策与 Agent 运行时对工具、状态、消息、中间件、错误和停止条件的职责划分。',
    type: 'short_answer',
    difficulty: 'medium',
    answer:
      '模型根据消息和工具 schema 生成内容或工具调用意图；harness/运行时维护消息与状态，执行工具，应用中间件、权限、重试和终止策略。模型不能直接访问外部系统，工具执行和业务授权必须由应用掌控。',
    tags: ['LangChain', 'Agent Harness', 'Tool Calling'],
    points: ['模型决策边界', '运行时职责', '应用授权'],
    sourceRefs: [LANGCHAIN_AGENTS],
  },
  {
    suffix: 'framework-structured-output-tools',
    title: '结构化输出和 Tool Calling 如何共存？',
    stem: '解释工具调用消息与最终结构化结果的区别，比较 provider 原生 schema 和 tool-based schema，处理校验失败。',
    type: 'short_answer',
    difficulty: 'hard',
    answer:
      '工具调用是请求应用执行动作，结构化输出是最终结果满足 schema 的契约。可根据模型支持情况使用 provider 原生结构化输出或 tool-based 策略；两者都要在服务端校验，处理解析失败和重试预算，不能把工具参数当作最终答案。',
    tags: ['LangChain', '结构化输出', 'Tool Calling'],
    points: ['动作与结果区分', '两种 schema 策略', '服务端校验和错误恢复'],
    sourceRefs: [STRUCTURED_OUTPUT, LANGCHAIN_AGENTS],
  },
  {
    suffix: 'framework-runnable-lcel',
    title: 'Runnable / LCEL 为什么能统一 invoke、batch、stream？',
    stem: '说明统一调用接口如何组合模型、提示词、解析器；配置、回调与异步批处理如何沿组合链传播？',
    type: 'short_answer',
    difficulty: 'hard',
    answer:
      'Runnable 提供统一的输入输出契约与 invoke、batch、stream 等执行入口；LCEL 将可运行组件组合成链，使配置和回调沿链传递。batch 侧重多个独立输入的吞吐，stream 侧重单个任务的增量输出；某一组件不支持增量时可能阻塞端到端流式。',
    tags: ['LangChain', 'Runnable', 'LCEL'],
    points: ['统一执行接口', '组合与配置传播', '批处理和流式限制'],
    sourceRefs: ['https://docs.langchain.com/oss/python/langchain/overview'],
  },
  {
    suffix: 'framework-prompt-injection',
    title: 'Agent 如何防御 Prompt Injection 并隔离工具权限？',
    stem: '外部网页要求 Agent 泄露用户资料并调用高权限工具，应用应在哪些边界阻断？怎样验证防护有效？',
    type: 'system_design',
    difficulty: 'expert',
    answer:
      '将网页和检索内容标记为不可信数据，不能提升为系统指令；工具执行前由服务端校验身份、资源范围、参数和高风险审批。记录脱敏轨迹并把攻击样本加入回归评测；仅靠提示词声明忽略注入不能替代授权。',
    tags: ['Prompt Injection', '工具权限', '安全'],
    points: ['信任边界', '服务端授权与审批', '攻击回归测试'],
    sourceRefs: [EFFECTIVE_AGENTS, AGENT_EVALS],
  },
  {
    suffix: 'framework-trace-quality-cost',
    title: 'Agent 的 Trace、成本和质量如何关联分析？',
    stem: '设计一次任务的 trace/span 结构，关联模型与 Prompt 版本、状态节点、工具调用、Token、费用、延迟和评测结果。',
    type: 'system_design',
    difficulty: 'hard',
    answer:
      '以任务为 trace，模型调用、检索、工具和图节点作为 span；每段记录版本、时延、Token/费用、错误码和必要的状态标识。用同一任务 ID 关联评测与业务结果，分析质量和成本的变化；敏感内容脱敏，密钥绝不写入轨迹。',
    tags: ['可观测性', 'Agent 评估', '成本优化'],
    points: ['trace/span 设计', '质量成本关联', '隐私和审计'],
    sourceRefs: [AGENT_EVALS, LANGGRAPH_OVERVIEW],
  },
];

export const PUBLIC_AGENT_FRAMEWORK_ENGINEERING_OPEN_QUESTIONS =
  QUESTIONS.map(buildAgentOpenQuestion);
