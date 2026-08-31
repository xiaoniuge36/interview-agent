import type { PublicChoiceQuestionInput } from './public-practice-question-builders';

/**
 * 增长与运营方向概念选择题：增长模型与运营指标高频考点。
 */
export const GROWTH_CHOICE_INPUTS: PublicChoiceQuestionInput[] = [
  {
    suffix: 'growth-choice-ltv-cac',
    title: 'LTV 与 CAC 的健康关系是哪项？',
    stem: '评估获客模式是否可持续，以下说法正确的是？',
    options: [
      'CAC 越高说明投放能力越强，模式越健康',
      '通常认为 LTV/CAC 大于 3、回收期可控时获客模式较健康',
      '只要 LTV 大于 CAC 就一定盈利',
      'LTV 与 CAC 没有关联',
    ],
    correctOptionIds: ['B'],
    answer: 'B。LTV/CAC ≥ 3 且 CAC 回收期可控是常用健康线；仅 LTV>CAC 会忽略毛利与资金占用。',
    tags: ['增长模型', 'LTV', '获客成本'],
  },
  {
    suffix: 'growth-choice-aarrr',
    title: 'AARRR 模型各环节的对应关系，哪项正确？',
    stem: '关于海盗指标 AARRR，以下对应关系正确的是？',
    options: [
      'Activation 指用户完成付费',
      'Retention 指用户把产品推荐给他人',
      'Referral 指用户自发传播带来新用户',
      'Acquisition 指用户体验到产品核心价值',
    ],
    correctOptionIds: ['C'],
    answer: 'C。五环节依次为获客、激活（首次体验核心价值）、留存、收入、推荐传播。',
    tags: ['AARRR', '增长模型'],
  },
  {
    suffix: 'growth-choice-retention-curve',
    title: '哪种留存曲线形态说明产品接近 PMF？',
    stem: '观察新用户留存曲线判断产品市场契合度，以下说法正确的是？',
    options: [
      '持续下滑直到归零的曲线',
      '下降后在某个水平趋于平稳的曲线，说明一批用户持续获得价值',
      '首日留存高就足够说明 PMF',
      '留存曲线与 PMF 无关',
    ],
    correctOptionIds: ['B'],
    answer: 'B。留存曲线出现平台期说明产品留住了一批长期用户；持续走向零则说明价值未被验证。',
    tags: ['留存分析', 'PMF'],
    difficulty: 'medium',
  },
  {
    suffix: 'growth-choice-viral-k',
    title: '病毒系数 K 值大于 1 意味着什么？',
    stem: '关于病毒传播系数 K，以下说法正确的是？',
    options: [
      '每个用户平均带来超过一个新用户，用户量可自增长',
      '广告投放回报率超过 100%',
      '用户留存率超过 50%',
      '产品一定盈利',
    ],
    correctOptionIds: ['A'],
    answer: 'A。K=邀请数×转化率；K>1 时每代用户能带来更多下一代用户，理论上实现自传播增长。',
    tags: ['病毒传播', '增长模型'],
    difficulty: 'medium',
  },
  {
    suffix: 'growth-choice-private-domain',
    title: '私域流量与公域流量的核心区别是哪项？',
    stem: '关于两类流量的运营差异，以下说法正确的是？',
    options: [
      '私域指可反复免费触达、自主运营的用户资产，公域按次付费或按平台规则分发',
      '私域就是微信群，公域就是抖音',
      '公域流量质量一定低于私域',
      '私域不需要内容运营',
    ],
    correctOptionIds: ['A'],
    answer:
      'A。核心区别在触达权：私域可低成本反复触达（社群、公众号、企微），公域受平台规则与付费约束。',
    tags: ['私域运营', '流量运营'],
  },
];

/**
 * 商业与交付方向概念选择题：销售方法论与项目管理高频考点。
 */
export const BUSINESS_CHOICE_INPUTS: PublicChoiceQuestionInput[] = [
  {
    suffix: 'business-choice-spin',
    title: 'SPIN 销售法的四类问题是什么？',
    stem: '用 SPIN 推进大客户销售时，四个字母分别代表？',
    options: [
      '现状、难点、暗示、需求效益问题，层层放大痛点价值',
      '策略、价格、谈判、成交',
      '寻源、拜访、报价、签约',
      '微笑、倾听、赞美、逼单',
    ],
    correctOptionIds: ['A'],
    answer: 'A。SPIN=Situation 现状、Problem 难点、Implication 影响放大、Need-payoff 需求效益。',
    tags: ['销售方法论', 'SPIN'],
    difficulty: 'medium',
  },
  {
    suffix: 'business-choice-triangle',
    title: '项目管理三角形指哪三个约束？',
    stem: '「项目管理铁三角」互相制衡的三要素是？',
    options: [
      '人力、物力、财力',
      '范围、时间、成本（质量受三者共同影响）',
      '计划、执行、复盘',
      '客户、团队、老板',
    ],
    correctOptionIds: ['B'],
    answer: 'B。范围、时间、成本三者互相约束，改变任意一角必然影响其他角或最终质量。',
    tags: ['项目管理', '铁三角'],
  },
  {
    suffix: 'business-choice-meddic',
    title: 'MEDDIC 中的 Champion 指什么角色？',
    stem: '大客户销售方法论 MEDDIC 里，Champion 的定义是？',
    options: [
      '客户方的最终拍板人',
      '客户内部真心支持你的方案、愿意帮你内部推动的人',
      '我方的销售冠军',
      '竞争对手的关键联系人',
    ],
    correctOptionIds: ['B'],
    answer:
      'B。Champion 是客户内部的支持者与内线，帮你获取信息、影响决策链；经营 Champion 是赢单关键。',
    tags: ['大客户销售', 'MEDDIC'],
    difficulty: 'medium',
  },
  {
    suffix: 'business-choice-health-score',
    title: '客户成功健康分通常不包含哪类信号？',
    stem: '构建客户健康度模型时，以下哪项通常不是健康分输入？',
    options: [
      '产品活跃度与核心功能使用深度',
      '服务工单与投诉趋势',
      '关键干系人变动与续约沟通反馈',
      '客户公司的股票代码',
    ],
    correctOptionIds: ['D'],
    answer: 'D。健康分围绕使用行为、服务体验、关系与商务信号构建；股票代码本身不构成健康信号。',
    tags: ['客户成功', '健康分'],
  },
  {
    suffix: 'business-choice-batna',
    title: '谈判中的 BATNA 指什么？',
    stem: '进入商务谈判前要明确自己的 BATNA，它的含义是？',
    options: [
      '最优报价金额',
      '谈判破裂时你的最佳替代方案，决定你的底气与底线',
      '对方的预算上限',
      '双方的合同模板',
    ],
    correctOptionIds: ['B'],
    answer:
      'B。BATNA 是谈不成时的最佳替代选项；替代方案越强底线越高，谈判前应主动改善自己的 BATNA。',
    tags: ['商务谈判', 'BATNA'],
    difficulty: 'medium',
  },
];

/**
 * 通用求职概念选择题：面试方法与职业常识，全部岗位适用。
 */
export const GENERIC_CHOICE_INPUTS: PublicChoiceQuestionInput[] = [
  {
    suffix: 'generic-choice-star',
    title: 'STAR 法则的四个要素是什么？',
    stem: '用 STAR 结构回答行为面试题时，四个字母分别代表？',
    options: [
      '优势、目标、行动、复盘',
      '情境、任务、行动、结果',
      '技能、团队、态度、责任',
      '开场、主体、总结、反问',
    ],
    correctOptionIds: ['B'],
    answer:
      'B。STAR=Situation 情境、Task 任务、Action 行动、Result 结果，重点笔墨放在行动与可量化结果。',
    tags: ['STAR', '面试方法'],
  },
  {
    suffix: 'generic-choice-resume',
    title: '哪种简历经历写法最有说服力？',
    stem: '描述项目经历时，以下哪种写法最能打动面试官？',
    options: [
      '「负责系统开发与维护工作」',
      '「参与多个重要项目」',
      '「重构订单查询链路，接口 P99 延迟从 800ms 降至 120ms，支撑大促峰值」',
      '「工作认真负责，学习能力强」',
    ],
    correctOptionIds: ['C'],
    answer: 'C。动作+量化结果+业务背景的写法最有说服力；职责罗列和自我评价缺乏证据支撑。',
    tags: ['简历优化', '成果表达'],
  },
  {
    suffix: 'generic-choice-reverse',
    title: '反问环节哪个问题给面试官的印象最好？',
    stem: '面试尾声面试官请你提问，以下哪个问题最加分？',
    options: [
      '「贵公司会经常加班吗？」',
      '「这个岗位入职后前三个月的成功标准是什么？」',
      '「我刚才表现怎么样？」',
      '「你们公司是做什么的？」',
    ],
    correctOptionIds: ['B'],
    answer: 'B。询问成功标准体现结果导向与入职即投入的姿态；公司基本信息应提前做功课。',
    tags: ['反问环节', '面试策略'],
  },
  {
    suffix: 'generic-choice-pyramid',
    title: '金字塔原理的表达顺序是哪项？',
    stem: '向面试官或高层汇报时，金字塔原理建议的表达结构是？',
    options: [
      '按时间顺序完整铺垫再给结论',
      '结论先行，再分层给出支撑理由与事实',
      '先讲细节数据再归纳',
      '想到哪说到哪，保持自然',
    ],
    correctOptionIds: ['B'],
    answer: 'B。金字塔原理主张结论先行、以上统下、归类分组，让听众先抓住核心再看支撑。',
    tags: ['结构化表达', '金字塔原理'],
  },
  {
    suffix: 'generic-choice-offer',
    title: '比较多个 Offer 时哪种做法更合理？',
    stem: '手上有多个 Offer 需要决策，以下做法最合理的是？',
    options: [
      '只比较月薪数字',
      '综合总包结构、业务前景、团队与成长空间，结合自己的职业阶段加权判断',
      '选公司名气最大的',
      '让家人替自己决定',
    ],
    correctOptionIds: ['B'],
    answer: 'B。Offer 决策应把薪酬结构、成长性、业务确定性与个人阶段目标放在同一框架里加权比较。',
    tags: ['Offer 决策', '职业规划'],
    difficulty: 'medium',
  },
];
