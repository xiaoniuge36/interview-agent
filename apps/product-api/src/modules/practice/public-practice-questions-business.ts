import type { PublicPracticeQuestionInput } from './public-practice-question-builders';

export const BUSINESS_DELIVERY_QUESTION_INPUTS: PublicPracticeQuestionInput[] = [
  {
    suffix: 'business-discovery',
    title: '如何识别客户的真实业务目标？',
    stem: '请说明访谈对象、现状诊断、成功标准、决策链路和需求确认方式。',
    answer: '覆盖关键干系人访谈，基于现状诊断确认业务目标、成功标准和决策链路。',
    tags: ['客户洞察', '业务目标'],
    points: ['客户场景', '成功标准', '需求确认'],
  },
  {
    suffix: 'business-solution',
    title: '如何把客户需求转化为价值方案？',
    stem: '请说明价值主张、方案范围、关键假设、实施路径和收益衡量。',
    answer: '围绕客户目标设计价值主张和范围，明确关键假设、实施路径与收益衡量方式。',
    tags: ['价值方案', '解决方案'],
    points: ['价值主张', '方案范围', '收益衡量'],
  },
  {
    suffix: 'business-stakeholders',
    title: '关键干系人目标不一致时如何推进？',
    stem: '请说明你如何识别不同诉求、建立共同目标、处理分歧并完成决策。',
    answer: '识别各方诉求和影响力，以共同业务目标与事实数据推进分歧收敛和决策。',
    tags: ['干系人管理', '协同'],
    points: ['诉求识别', '共同目标', '决策推进'],
  },
  {
    suffix: 'business-delivery-risk',
    title: '如何管理复杂项目的交付风险？',
    stem: '请说明风险识别、分级、沟通、预案、升级与验收机制。',
    answer: '建立风险台账和分级预案，透明沟通影响，必要时升级决策并以验收标准闭环。',
    tags: ['交付管理', '风险控制'],
    points: ['风险识别', '预案沟通', '验收闭环'],
  },
  {
    suffix: 'business-renewal',
    title: '如何用项目成果推动续约或扩展合作？',
    stem: '请说明价值复盘、客户成果、经营数据、下一阶段机会和协同策略。',
    answer: '用客户成果和经营数据复盘已实现价值，识别下一阶段机会并制定协同推进计划。',
    tags: ['客户成功', '续约增长'],
    points: ['客户成果', '经营数据', '扩展机会'],
  },
];

export const GENERIC_QUESTION_INPUTS: PublicPracticeQuestionInput[] = [
  {
    suffix: 'generic-story',
    title: '如何结构化讲述一个代表性项目？',
    stem: '请说明背景、目标、个人职责、关键行动、协作过程和结果。',
    answer: '按背景、目标、行动、结果和复盘组织内容，突出个人贡献与可验证证据。',
    tags: ['结构化表达', '项目经历'],
    points: ['背景目标', '个人贡献', '量化结果'],
  },
  {
    suffix: 'generic-problem',
    title: '面对模糊问题时如何推进？',
    stem: '请说明你如何澄清目标、拆解问题、验证假设、协调资源并形成结果。',
    answer: '先澄清目标和约束，再拆解问题、验证假设、协调资源并持续校准结果。',
    tags: ['问题解决', '逻辑'],
    points: ['目标澄清', '问题拆解', '验证迭代'],
  },
  {
    suffix: 'generic-collaboration',
    title: '跨团队协作遇到阻力时如何处理？',
    stem: '请说明你如何理解分歧、建立共识、明确责任和保障交付。',
    answer: '通过共同目标和事实证据建立共识，明确责任、节奏和风险处理机制。',
    tags: ['协作沟通', '推进'],
    points: ['共识建立', '责任明确', '交付保障'],
  },
  {
    suffix: 'generic-result',
    title: '如何证明你在项目中的真实贡献？',
    stem: '请说明你会如何界定职责、提供过程证据、量化结果并说明外部影响。',
    answer: '明确个人职责和关键决策，以过程证据、量化结果和协作反馈证明真实贡献。',
    tags: ['成果表达', '影响力'],
    points: ['职责边界', '过程证据', '结果影响'],
  },
  {
    suffix: 'generic-reflection',
    title: '如何复盘一次项目失利？',
    stem: '请说明事实回顾、根因分析、个人反思、改进动作和后续验证。',
    answer: '基于事实回顾和根因分析形成个人反思，制定改进动作并在后续工作中验证。',
    tags: ['复盘成长', '改进'],
    points: ['事实回顾', '根因分析', '改进验证'],
  },
];
