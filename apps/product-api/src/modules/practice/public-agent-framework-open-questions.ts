import {
  buildAgentOpenQuestion,
  type AgentOpenQuestionInput,
} from './public-agent-question-builders';

const GRAPH_API = 'https://docs.langchain.com/oss/python/langgraph/graph-api';
const PREGEL = 'https://docs.langchain.com/oss/python/langgraph/pregel';
const PERSISTENCE = 'https://docs.langchain.com/oss/python/langgraph/persistence';
const INTERRUPTS = 'https://docs.langchain.com/oss/python/langgraph/interrupts';
const LANGCHAIN_AGENTS = 'https://docs.langchain.com/oss/python/langchain/agents';
const LANGGRAPH_OVERVIEW = 'https://docs.langchain.com/oss/python/langgraph/overview';
const EFFECTIVE_AGENTS = 'https://www.anthropic.com/engineering/building-effective-agents';
const AGENT_EVALS = 'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents';

const QUESTIONS: AgentOpenQuestionInput[] = [
  {
    suffix: 'framework-langchain-vs-langgraph',
    title: 'LangChain 和 LangGraph 有什么区别？',
    stem: '从抽象层级、状态控制、持久化和使用场景比较两者；一个带工具的简单 Agent 与一个可恢复的审批流程分别如何实现？',
    type: 'short_answer',
    difficulty: 'medium',
    answer:
      'LangChain 提供模型、工具、Agent 等高层组件；LangGraph 提供显式状态、节点、边、持久化和人工中断的底层编排。LangChain 的 Agent 运行在 LangGraph 之上。简单工具循环可先使用高层 Agent，复杂分支、恢复和审批通常需要更直接地控制图。',
    tags: ['LangChain', 'LangGraph', '框架选型'],
    points: ['抽象层级与组合关系', '状态和恢复能力', '按场景选型'],
    sourceRefs: [LANGCHAIN_AGENTS, LANGGRAPH_OVERVIEW],
  },
  {
    suffix: 'framework-stategraph-execution',
    title: 'StateGraph 如何执行节点与条件边？',
    stem: '解释 State、Node、Edge、条件路由与 super-step 的关系，并说明节点返回的状态更新何时对后续节点可见。',
    type: 'short_answer',
    difficulty: 'hard',
    answer:
      'StateGraph 以 State schema 定义通道，Node 读取状态并返回局部更新，Edge 决定后继节点。运行时按 super-step 调度，同一步中的节点可并行执行，它们的更新经 reducer 合并后供后续步骤读取；条件边由当前状态选择路径。',
    tags: ['LangGraph', 'StateGraph', '执行模型'],
    points: ['状态与节点职责', '条件路由', 'super-step 可见性'],
    sourceRefs: [GRAPH_API, PREGEL],
  },
  {
    suffix: 'framework-concurrent-reducer',
    title: 'Reducer 如何合并并发节点对同一状态字段的更新？',
    stem: '比较默认覆盖、列表追加和自定义 reducer；两个并行节点同时写一个字段时会发生什么，怎样设计可预测的聚合？',
    type: 'short_answer',
    difficulty: 'hard',
    answer:
      '没有 reducer 的字段采用覆盖语义，不适合让并行节点同时更新。为并发聚合定义满足业务语义的 reducer，例如列表合并或计数相加，并尽量使合并顺序不影响结果；同时审查重复执行和去重要求。',
    tags: ['LangGraph', 'Reducer', '并发状态'],
    points: ['默认更新语义', '并发写入约束', '聚合与去重设计'],
    sourceRefs: [GRAPH_API],
  },
  {
    suffix: 'framework-checkpoint-thread',
    title: 'Checkpoint 与 thread_id 如何支持断点续跑？',
    stem: '说明 checkpointer 保存什么、thread_id 如何定位会话，以及恢复时怎样避免跨用户读取或重复执行外部副作用。',
    type: 'system_design',
    difficulty: 'hard',
    answer:
      '编译图时接入 checkpointer，调用时以 thread_id 定位持久化线程并恢复状态。服务端必须把 thread_id 与已认证用户及租户绑定，不能把客户端传入的 ID 当作授权。节点可能重跑，外部写操作需要幂等键或独立事务。',
    tags: ['LangGraph', 'Checkpoint', '权限'],
    points: ['持久化与恢复', '线程授权隔离', '副作用幂等'],
    sourceRefs: [PERSISTENCE, INTERRUPTS],
  },
  {
    suffix: 'framework-agent-vs-llm',
    title: 'Agent 和普通 LLM 应用的边界是什么？',
    stem: '从目标、可观察状态、工具、控制循环和终止条件解释 Agent；何时只用一次模型调用或确定性工作流？',
    type: 'short_answer',
    difficulty: 'medium',
    answer:
      'Agent 在受约束的循环中依据环境反馈选择动作并使用工具，应用仍负责执行、权限和停止条件。任务路径固定时优先确定性工作流，单次生成足够时无需 Agent；只有动态决策带来可测收益时才增加自主循环。',
    tags: ['Agent 原理', '架构取舍'],
    points: ['Agent 组成', '应用控制边界', '复杂度取舍'],
    sourceRefs: [EFFECTIVE_AGENTS],
  },
  {
    suffix: 'framework-tool-calling-loop',
    title: 'Tool Calling 的完整闭环是什么？',
    stem: '从工具 schema 暴露到模型选择、参数校验、授权执行、tool_call_id 回填和继续推理，描述一轮完整调用。',
    type: 'short_answer',
    difficulty: 'medium',
    answer:
      '应用提供工具定义，模型生成带名称和参数的调用意图；应用校验参数和权限后执行工具，以对应 tool_call_id 把结果或结构化错误回填消息，再决定是否继续调用模型。模型输出调用意图不等于已经执行。',
    tags: ['Tool Calling', 'Agent Loop', '安全'],
    points: ['调用意图与执行分离', '参数和权限校验', '结果关联与继续推理'],
    sourceRefs: [LANGCHAIN_AGENTS],
  },
  {
    suffix: 'framework-rag-three-pipelines',
    title: 'RAG 的索引、检索和生成三条链路如何分别优化？',
    stem: '讨论切分与元数据、混合召回与重排、证据引用与忠实度；怎样定位答案错误发生在哪一段？',
    type: 'system_design',
    difficulty: 'hard',
    answer:
      '索引侧保证切分边界、权限元数据和版本可追溯；检索侧按权限过滤后做召回与重排；生成侧只基于证据作答并保留引用。用带黄金证据的评测集分别测召回、重排和答案忠实度，定位是没找到、排错了还是编造了。',
    tags: ['RAG', '检索评估', '引用'],
    points: ['索引质量', '召回与重排', '证据和分层评测'],
    sourceRefs: [EFFECTIVE_AGENTS, AGENT_EVALS],
  },
  {
    suffix: 'framework-supervisor-handoff-router',
    title: 'Supervisor、Handoff 与 Router 三种多 Agent 模式怎么选？',
    stem: '比较集中调度、控制权转交和一次性路由的状态归属、上下文传递、调用成本与失败定位。',
    type: 'system_design',
    difficulty: 'hard',
    answer:
      'Router 适合根据任务类型选择一次处理路径；Supervisor 由协调者持续分配子任务并汇总结果；Handoff 把控制权交给更合适的角色。先定义共享状态和权限边界，再按任务是否需要反复协调、是否可并行以及延迟预算选型。',
    tags: ['多 Agent', 'Supervisor', 'Handoff'],
    points: ['三种控制流', '状态和权限归属', '成本与故障取舍'],
    sourceRefs: [EFFECTIVE_AGENTS, GRAPH_API],
  },
  {
    suffix: 'framework-functional-vs-graph-api',
    title: 'LangGraph Functional API 与 Graph API 如何选？',
    stem: '比较入口函数与任务、显式节点与边在分支、状态检查、持久化和迁移中的表达方式。',
    type: 'short_answer',
    difficulty: 'hard',
    answer:
      'Functional API 用 entrypoint 和 task 保留常规代码组织形式，适合已有函数流程逐步加入持久执行；Graph API 显式声明状态、节点和边，更便于检查复杂分支与可视化。两者都可接入持久化，选择取决于控制流是否需要显式建模。',
    tags: ['LangGraph', 'Functional API', 'Graph API'],
    points: ['两种编排表达', '持久化共同能力', '按控制流选型'],
    sourceRefs: ['https://docs.langchain.com/oss/python/langgraph/functional-api', GRAPH_API],
  },
  {
    suffix: 'framework-recoverable-observable-agent',
    title: '如何设计可恢复、可观测的生产 Agent？',
    stem: '以一个需要工具写入和人工审批的任务为例，设计状态快照、幂等、重试、审计、trace 与失败恢复测试。',
    type: 'system_design',
    difficulty: 'expert',
    answer:
      '用显式状态和持久化线程记录流程，在副作用节点前建立幂等业务键，高风险动作使用 interrupt 审批。按错误类型有限重试并设超时与停止条件；trace 关联工作流、模型、工具和状态转移。用故障注入验证重复执行和审批恢复。',
    tags: ['Agent 工程', 'LangGraph', '可观测性'],
    points: ['状态持久化和审批', '副作用与失败恢复', '观测和故障注入'],
    sourceRefs: [PERSISTENCE, INTERRUPTS, AGENT_EVALS],
  },
  {
    suffix: 'framework-pregel-superstep',
    title: 'Pregel / super-step 为什么是 LangGraph 执行模型的关键？',
    stem: '解释 Plan、Execute、Update 三阶段、并行节点的状态隔离、消息传递和图的终止条件。',
    type: 'short_answer',
    difficulty: 'expert',
    answer:
      '运行时在 Plan 阶段选择就绪节点，Execute 阶段并行执行，Update 阶段统一应用写入并决定下一轮。因此同一 super-step 的节点不会直接看到彼此本轮写入；所有节点不再激活且无待传消息时图结束。',
    tags: ['LangGraph', 'Pregel', 'super-step'],
    points: ['三阶段模型', '并行写入可见性', '终止条件'],
    sourceRefs: [PREGEL],
  },
  {
    suffix: 'framework-compile',
    title: 'LangGraph 的 compile 到底做什么？',
    stem: '说明图构建与编译的边界、结构校验、checkpointer 注入和运行时配置；为什么不应每个请求重新构造图？',
    type: 'short_answer',
    difficulty: 'hard',
    answer:
      '先定义状态、节点和边，再调用 compile 得到可执行图；编译阶段检查图结构并接入 checkpointer、断点等配置。稳定图可在进程启动时编译复用，请求级身份和线程参数在调用时传入，避免把某个用户的状态固化到共享图。',
    tags: ['LangGraph', 'Graph API', '编译'],
    points: ['构建和编译边界', '编译期配置', '请求级上下文隔离'],
    sourceRefs: [GRAPH_API],
  },
  {
    suffix: 'framework-state-schemas',
    title: 'State schema、私有 State 与输入输出 schema 怎么划分？',
    stem: '给出内部通道和公开输入输出的划分，并解释私有通道是否天然不会出现在 streaming 事件中。',
    type: 'short_answer',
    difficulty: 'hard',
    answer:
      '内部 State 包含工作流需要的通道，输入输出 schema 限制调用边界，额外的私有通道供节点协作。私有通道是图内组织概念，不是安全隔离；values 流可能包含这些通道，需要显式筛选输出并在 API 层做脱敏和授权。',
    tags: ['LangGraph', 'State schema', '安全'],
    points: ['内部与公开 schema', '私有通道语义', '流式数据防泄漏'],
    sourceRefs: [GRAPH_API],
  },
  {
    suffix: 'framework-reducer-left-right',
    title: 'Reducer 的 left / right 参数如何合并状态？',
    stem: '以列表追加和计数器为例说明旧值与节点增量；哪些 reducer 在并发执行或恢复时会产生重复与顺序问题？',
    type: 'short_answer',
    difficulty: 'expert',
    answer:
      'Reducer 接收当前值 left 与更新 right 并返回新值。列表拼接会保留所有增量，但并发顺序不应被当成业务顺序；重复写入会重复追加。对有唯一性的事件按 ID 去重，对必须有序的内容携带序号再排序。',
    tags: ['LangGraph', 'Reducer', '并发状态'],
    points: ['left/right 合并语义', '并发顺序风险', '幂等聚合'],
    sourceRefs: [GRAPH_API],
  },
  {
    suffix: 'framework-reducer-reset',
    title: '为什么返回空列表未必能清空带 Reducer 的字段？',
    stem: '以列表相加 reducer 为例说明空更新的结果；需要清空时该如何处理？',
    type: 'short_answer',
    difficulty: 'expert',
    answer:
      '列表相加时旧值 + [] 仍是旧值，所以空列表不是清空命令。需要重置时可使用 LangGraph 的 Overwrite 或明确的重置状态设计；重置必须处理同一步其他节点的写入冲突。',
    tags: ['LangGraph', 'Reducer', 'Overwrite'],
    points: ['空更新语义', '显式重置方法', '并发重置冲突'],
    sourceRefs: [GRAPH_API],
  },
  {
    suffix: 'framework-send-fanout',
    title: 'Send 如何实现动态 fan-out / fan-in？',
    stem: '对一组未知长度的文档并行处理并汇总，描述条件路由、每个分支的输入和结果 reducer。',
    type: 'system_design',
    difficulty: 'hard',
    answer:
      '路由函数为每个文档返回一个 Send，指定目标节点和该分支的输入；运行时动态展开并行任务。工作节点只返回局部结果，汇总字段使用 reducer 聚合，并以文档 ID 去重、控制并发和失败策略。',
    tags: ['LangGraph', 'Send', '并行编排'],
    points: ['动态分支创建', '分支输入隔离', '归并与故障处理'],
    sourceRefs: [GRAPH_API],
  },
  {
    suffix: 'framework-command-routing',
    title: 'Command 为什么能同时 update 和 goto？',
    stem: '说明节点返回 Command 时如何原子表达状态更新和后续路由；与条件边、跨子图导航及 resume 有什么关系？',
    type: 'short_answer',
    difficulty: 'hard',
    answer:
      'Command 把节点的状态更新与动态目标放在同一个返回值中，适合路由取决于本节点计算结果的场景。条件边把路由与节点更新分开；跨图导航需要指定 graph 目标，恢复人工中断则用 Command(resume=...)。不要为同一节点同时配置会额外触发的静态边。',
    tags: ['LangGraph', 'Command', '控制流'],
    points: ['update/goto 语义', '与条件边的区别', '跨图和恢复边界'],
    sourceRefs: [GRAPH_API, INTERRUPTS],
  },
];

export const PUBLIC_AGENT_FRAMEWORK_OPEN_QUESTIONS = QUESTIONS.map(buildAgentOpenQuestion);
