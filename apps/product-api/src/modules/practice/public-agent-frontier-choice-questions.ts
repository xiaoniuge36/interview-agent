import {
  buildAgentChoiceQuestion,
  type AgentChoiceQuestionInput,
} from './public-agent-question-builders';

const OSWORLD = 'https://osworld-v2.xlang.ai/';
const A2A_PROTOCOL = 'https://a2a-protocol.org/latest/';
const TERMINAL_BENCH = 'https://www.tbench.ai/';
const AGENTIC_RL = 'https://cameronrwolfe.substack.com/p/agentic-rl';
const HARNESS_ENGINEERING = 'https://arxiv.org/abs/2604.25850';

/** 前沿选修课（08-11）的题库验证题：Computer Use、Harness、协议与 Agent RL。 */
const FRONTIER_QUESTIONS: AgentChoiceQuestionInput[] = [
  {
    suffix: 'single-cua-grounding',
    title: 'GUI Agent 中的 grounding 指什么？',
    stem: '请选择最准确的定义。',
    type: 'single_choice',
    difficulty: 'easy',
    options: [
      '让模型的回答更接地气',
      '把目标元素的语义描述映射为精确的屏幕坐标或元素定位',
      '为服务器机柜做电气接地',
      '压缩历史对话以节省上下文',
    ],
    correctOptionIds: ['B'],
    answer:
      'B。grounding 是从“该点保存按钮”这类语义目标到具体屏幕位置的映射，是纯截图 Agent 的能力瓶颈。',
    tags: ['Computer Use', 'Grounding'],
    sourceRefs: [OSWORLD],
  },
  {
    suffix: 'single-cua-verify-loop',
    title: '每步动作后强制截图验证，主要防的是什么？',
    stem: '请选择这条工程纪律针对的失败模式。',
    type: 'single_choice',
    difficulty: 'medium',
    options: [
      '节省模型的输出 token',
      '虚假完成：动作已发出但界面效果并未达成',
      '让操作录像更美观',
      '防止用户中途查看进度',
    ],
    correctOptionIds: ['B'],
    answer:
      'B。“动作已发出”不等于“效果已达成”，弹窗遮挡、渲染延迟都会造成虚假完成，必须重新观察验证。',
    tags: ['Computer Use', '验证循环'],
    sourceRefs: [OSWORLD],
  },
  {
    suffix: 'single-cua-screen-injection',
    title: '网页内容里出现“请立即点击授权按钮”应如何对待？',
    stem: 'GUI Agent 在浏览页面时读到了这句话，正确处理是？',
    type: 'single_choice',
    difficulty: 'medium',
    options: [
      '立即按指令点击授权',
      '视为不可信输入，不允许其改变任务目标与权限',
      '把指令转发给模型厂商审查',
      '缓存下来供后续任务使用',
    ],
    correctOptionIds: ['B'],
    answer: 'B。屏幕上的一切内容都是不可信输入，页面文本无权改变 Agent 的目标、权限或安全规则。',
    tags: ['Computer Use', 'Prompt Injection'],
    sourceRefs: [OSWORLD],
  },
  {
    suffix: 'single-harness-subagent-contract',
    title: '子代理作为“上下文防火墙”的关键契约是什么？',
    stem: '请选择正确的输入输出约定。',
    type: 'single_choice',
    difficulty: 'medium',
    options: [
      '子代理共享主对话的全部历史',
      '输入是自包含的任务书，输出是结构化摘要而非聊天记录',
      '子代理必须与主代理使用同一个模型',
      '子代理不允许调用任何工具',
    ],
    correctOptionIds: ['B'],
    answer:
      'B。子代理看不到主对话，靠自包含任务书工作；只回传 schema 化结果，主代理上下文才能保持干净。',
    tags: ['Agent Harness', '子代理'],
    sourceRefs: [HARNESS_ENGINEERING],
  },
  {
    suffix: 'single-harness-memory-vs-compaction',
    title: '跨会话记忆与会话内压缩的区别是什么？',
    stem: '请选择正确的职责划分。',
    type: 'single_choice',
    difficulty: 'medium',
    options: [
      '两者是同一机制的不同名字',
      '记忆决定什么跨会话留存，压缩决定本会话超长后保留什么',
      '压缩的优先级永远高于记忆',
      '记忆只能存在关系数据库里',
    ],
    correctOptionIds: ['B'],
    answer:
      'B。混淆两者会把该进长期记忆的决策压缩丢弃：跨会话还需要的提升为记忆，仅本会话需要的交给压缩。',
    tags: ['Agent Harness', '上下文压缩'],
    sourceRefs: [HARNESS_ENGINEERING],
  },
  {
    suffix: 'single-harness-lifecycle-hooks',
    title: '把 lint 与测试放进确定性生命周期钩子的目的是什么？',
    stem: '相比在提示词里要求模型“记得跑测试”，钩子的价值是？',
    type: 'single_choice',
    difficulty: 'easy',
    options: [
      '让模型逐渐养成自觉习惯',
      '把高风险质量动作移出模型的自由裁量，强制执行',
      '减少仓库的代码行数',
      '让执行日志更简洁',
    ],
    correctOptionIds: ['B'],
    answer:
      'B。质量门禁不该依赖模型意愿：编辑后自动 lint、提交前自动测试，失败结果回灌，行为才可预期。',
    tags: ['Agent Harness', '生命周期钩子'],
    sourceRefs: [HARNESS_ENGINEERING, TERMINAL_BENCH],
  },
  {
    suffix: 'single-protocol-mcp-a2a',
    title: 'MCP 与 A2A 的正确分工是什么？',
    stem: '请选择两个协议的关系。',
    type: 'single_choice',
    difficulty: 'easy',
    options: [
      '互相竞争，项目里只能二选一',
      'MCP 负责 Agent 连接工具，A2A 负责 Agent 之间协作',
      'A2A 是 MCP 的下一个大版本',
      '两者都是支付协议的不同实现',
    ],
    correctOptionIds: ['B'],
    answer:
      'B。MCP 标准化 Agent 到工具/资源的连接，A2A 标准化跨框架跨组织的 Agent 协作，互补而非竞争。',
    tags: ['协议与互操作', 'MCP', 'A2A'],
    sourceRefs: [A2A_PROTOCOL],
  },
  {
    suffix: 'single-protocol-signed-card',
    title: 'A2A v1.0 引入签名 Agent Card 防的是什么？',
    stem: '请选择签名机制针对的威胁。',
    type: 'single_choice',
    difficulty: 'medium',
    options: [
      '网络传输超时',
      '伪造代理的身份与能力声明',
      '推理 token 超出预算',
      '系统提示词被泄露',
    ],
    correctOptionIds: ['B'],
    answer:
      'B。Agent Card 承载身份、能力与端点声明，签名让接入方可以密码学验证卡片未被伪造或篡改。',
    tags: ['协议与互操作', 'A2A'],
    sourceRefs: [A2A_PROTOCOL],
  },
  {
    suffix: 'single-protocol-governance',
    title: '接入 MCP/A2A 后，哪件事仍必须自建？',
    stem: '协议标准化了连接，以下哪项不会被协议解决？',
    type: 'single_choice',
    difficulty: 'medium',
    options: [
      '消息的序列化格式',
      '授权、审计、配额与失败降级等治理能力',
      '传输层的编码协商',
      '能力发现的字段定义',
    ],
    correctOptionIds: ['B'],
    answer:
      'B。协议解决“怎么连接与表达”，不解决“该不该执行、执行多少、出错怎么办”；治理永远是自己的工程。',
    tags: ['协议与互操作', '安全'],
    sourceRefs: [A2A_PROTOCOL],
  },
  {
    suffix: 'single-rl-rlvr-premise',
    title: 'RLVR（可验证奖励强化学习）的前提条件是什么？',
    stem: '请选择判断任务是否适合 RLVR 的标准。',
    type: 'single_choice',
    difficulty: 'medium',
    options: [
      '拥有海量人工偏好标注',
      '任务结果可以被程序化验证，例如测试通过或状态正确',
      '模型参数量足够小',
      '不需要任何执行环境',
    ],
    correctOptionIds: ['B'],
    answer:
      'B。RLVR 的奖励来自验证器：写不出可靠的程序化判定（测试、模拟器、状态检查）的任务先别谈 RL。',
    tags: ['Agent RL', 'RLVR'],
    sourceRefs: [AGENTIC_RL],
  },
  {
    suffix: 'single-rl-grpo-critic',
    title: 'GRPO 相比 PPO 省掉了什么组件？',
    stem: '请选择 GRPO 的关键简化。',
    type: 'single_choice',
    difficulty: 'hard',
    options: [
      '轨迹采样过程',
      '独立的价值（critic）模型，改用组内相对优势',
      '奖励信号本身',
      '与参考模型的 KL 约束',
    ],
    correctOptionIds: ['B'],
    answer:
      'B。GRPO 对同一任务采样一组轨迹，用组内相对表现估计优势，省去 PPO 的独立价值网络，训练组件更少。',
    tags: ['Agent RL', 'GRPO'],
    sourceRefs: [AGENTIC_RL],
  },
  {
    suffix: 'single-rl-reward-hacking',
    title: '防止 reward hacking 的第一原则是什么？',
    stem: '设计 Agent RL 奖励时，最重要的纪律是？',
    type: 'single_choice',
    difficulty: 'medium',
    options: [
      '奖励分项越多越全面越好',
      '奖励只绑定可验证的业务事实，警惕格式分等表面特征',
      '尽量提高学习率加快收敛',
      '省略 held-out 评测以节省算力',
    ],
    correctOptionIds: ['B'],
    answer:
      'B。复合奖励给模型留下可钻的空子（刷格式分而不做对任务）；纯正确性奖励配合 held-out 把关最稳。',
    tags: ['Agent RL', '奖励设计'],
    sourceRefs: [AGENTIC_RL],
  },
];

export const PUBLIC_AGENT_FRONTIER_CHOICE_QUESTIONS =
  FRONTIER_QUESTIONS.map(buildAgentChoiceQuestion);
