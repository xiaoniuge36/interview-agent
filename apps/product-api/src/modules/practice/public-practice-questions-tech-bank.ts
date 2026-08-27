import type { PublicPracticeQuestionInput } from './public-practice-question-builders';

/**
 * 工程研发扩充题库：覆盖前端、后端、测试、DevOps 高频面试题，
 * 题型混合基础概念（short_answer）、行为面（behavioral）与项目深挖（project_deep_dive）。
 */
export const ENGINEERING_BANK_INPUTS: PublicPracticeQuestionInput[] = [
  {
    suffix: 'engineering-http-cache',
    title: '强缓存与协商缓存有什么区别？',
    stem: '请说明浏览器强缓存与协商缓存的判定流程、相关响应头，以及各自适用的资源类型。',
    answer:
      '强缓存由 Cache-Control/Expires 决定命中后不发请求；协商缓存通过 ETag/Last-Modified 与服务端确认资源是否变化，未变化返回 304。静态指纹资源用强缓存，HTML 等入口用协商缓存。',
    tags: ['网络基础', 'HTTP 缓存', '前端', 'company:腾讯'],
    points: ['判定流程', '关键响应头', '资源策略'],
    type: 'short_answer',
    difficulty: 'easy',
  },
  {
    suffix: 'engineering-first-screen',
    title: '首屏加载时间过长如何排查和优化？',
    stem: '线上页面白屏时间超过三秒，请说明你的排查路径、常见瓶颈和优化手段，并说明如何验证收益。',
    answer:
      '用 Performance 面板和 RUM 指标拆解 TTFB、资源加载与渲染阶段，针对性做代码分割、资源压缩、预加载、SSR 或缓存优化，以 LCP/FCP 指标对比验证收益。',
    tags: ['性能优化', '前端', '可观测性'],
    points: ['指标拆解', '瓶颈定位', '收益验证'],
    type: 'short_answer',
  },
  {
    suffix: 'engineering-acid',
    title: '数据库事务的 ACID 与隔离级别怎么理解？',
    stem: '请解释事务四大特性，说明四种隔离级别分别解决什么并发问题，以及默认隔离级别下仍可能出现的问题。',
    answer:
      'ACID 指原子性、一致性、隔离性、持久性；读未提交到串行化依次解决脏读、不可重复读、幻读。可重复读级别下仍可能出现幻读或写偏斜，需要间隙锁或显式加锁处理。',
    tags: ['数据库', '事务', '后端基础'],
    points: ['特性解释', '隔离级别对应问题', '边界场景'],
    type: 'short_answer',
    difficulty: 'easy',
  },
  {
    suffix: 'engineering-redis-cache',
    title: '缓存穿透、击穿、雪崩分别如何应对？',
    stem: '请区分这三类缓存异常的成因，并针对每一类给出可落地的防护方案与取舍。',
    answer:
      '穿透是查不存在的数据，用布隆过滤器或空值缓存；击穿是热点 key 过期瞬间打穿，用互斥重建或逻辑过期；雪崩是大批 key 同时失效，用过期时间打散、多级缓存和限流兜底。',
    tags: ['缓存', 'Redis', '高可用', 'company:美团'],
    points: ['成因区分', '防护方案', '方案取舍'],
    type: 'short_answer',
  },
  {
    suffix: 'engineering-mq-reliability',
    title: '引入消息队列后如何保证消息不丢失？',
    stem: '请从生产端、存储端、消费端三个环节说明消息可靠性保障，以及重复消费的处理方式。',
    answer:
      '生产端用确认机制与本地消息表，存储端开启持久化与副本，消费端手动提交位点并保证幂等。重复消费靠业务幂等键去重，而不是追求恰好一次投递。',
    tags: ['消息队列', '架构设计', '可靠性'],
    points: ['三端保障', '幂等设计', '取舍说明'],
    type: 'short_answer',
  },
  {
    suffix: 'engineering-refactor-case',
    title: '讲一个你主导的技术重构项目',
    stem: '请说明重构的动机、方案设计、灰度与回滚策略、推进中的阻力，以及最终如何量化收益。',
    answer:
      '围绕真实痛点定义重构目标与边界，通过绞杀者模式渐进迁移，用双跑对账和灰度控制风险，以性能、缺陷率或研发效率指标量化收益并沉淀规范。',
    tags: ['技术重构', '架构演进', '技术决策'],
    points: ['重构动机', '风险控制', '收益量化'],
    difficulty: 'hard',
  },
  {
    suffix: 'engineering-conflict',
    title: '与同事在技术方案上产生严重分歧怎么办？',
    stem: '请结合真实经历说明你如何处理技术分歧：如何听取对方理由、用什么依据决策、最后如何落地。',
    answer:
      '先完整复述对方方案确认理解，把分歧转成可比较的维度（性能、成本、演进性），用数据或原型验证，必要时请架构师仲裁，决策后无论采纳谁的方案都全力执行。',
    tags: ['协作沟通', '技术分歧', '团队合作'],
    points: ['倾听确认', '客观比较', '决策执行'],
    type: 'behavioral',
    difficulty: 'easy',
  },
  {
    suffix: 'engineering-test-strategy',
    title: '如何为一个业务系统设计自动化测试体系？',
    stem: '请说明测试分层策略、用例优先级、测试数据管理，以及如何度量测试体系的有效性。',
    answer:
      '按金字塔分层：单元测试覆盖核心逻辑，接口测试守住契约，少量端到端守住主流程；用风险与变更频率决定用例优先级，用逃逸缺陷率和回归耗时度量有效性。',
    tags: ['测试策略', '质量保障', '自动化测试'],
    points: ['分层策略', '优先级依据', '有效性度量'],
    type: 'short_answer',
  },
  {
    suffix: 'engineering-cicd',
    title: '如何设计一条从提交到上线的 CI/CD 流水线？',
    stem: '请说明流水线的关键阶段、每个阶段的卡点标准，以及如何平衡发布速度与稳定性。',
    answer:
      '提交触发静态检查与单测，合并后构建镜像跑集成测试，发布走灰度环境验证核心指标再全量；卡点用质量门禁自动化，紧急修复保留可审计的快速通道。',
    tags: ['DevOps', 'CI/CD', '工程效率', 'company:字节跳动'],
    points: ['阶段设计', '卡点标准', '速度与稳定平衡'],
    type: 'short_answer',
  },
  {
    suffix: 'engineering-learning',
    title: '你如何跟进新技术？举一个真实应用的例子',
    stem: '请说明你的技术信息来源和学习方法，并讲一次把新技术引入项目的完整过程与结果。',
    answer:
      '通过官方文档、源码和社区实践保持输入，先在边界清晰的小场景验证价值，再评估维护成本与团队接受度，用结果数据说服团队推广并沉淀文档。',
    tags: ['学习能力', '技术选型'],
    points: ['学习方法', '落地验证', '结果沉淀'],
    type: 'behavioral',
  },
];

/**
 * 数据方向扩充题库：覆盖 SQL、指标体系、异动分析、用户画像、机器学习高频题。
 */
export const DATA_BANK_INPUTS: PublicPracticeQuestionInput[] = [
  {
    suffix: 'data-sql-window',
    title: '如何用窗口函数解决 TopN 与连续行为问题？',
    stem: '请说明分组 TopN 和连续 N 天登录两类经典 SQL 题的窗口函数解法与易错点。',
    answer:
      'TopN 用 row_number 按组内排序后过滤序号；连续登录用日期减去 row_number 构造分组键统计连续段。注意去重、并列名次函数差异与空值处理。',
    tags: ['SQL', '窗口函数', '数据处理', 'company:美团'],
    points: ['解法思路', '函数选择', '易错点'],
    type: 'short_answer',
    difficulty: 'easy',
  },
  {
    suffix: 'data-retention-drop',
    title: '次日留存突然下降 5%，如何做异动归因？',
    stem: '请说明从确认数据真实性到定位原因的完整分析路径，以及如何区分产品、渠道与外部因素。',
    answer:
      '先排除口径与埋点问题，再按渠道、版本、人群、时间多维拆解找差异集中点，结合发版记录和运营动作交叉验证，输出可行动的归因结论。',
    tags: ['异动分析', '留存', '归因', 'company:字节跳动'],
    points: ['数据校验', '维度拆解', '结论行动'],
    type: 'short_answer',
  },
  {
    suffix: 'data-north-star',
    title: '如何为一个产品选择北极星指标？',
    stem: '请说明北极星指标的判断标准，并举例说明不同商业模式下的北极星指标差异。',
    answer:
      '北极星要同时反映用户价值与商业价值、可影响可拆解。内容产品看有效消费时长，交易产品看成交用户数，工具产品看核心任务完成率，并配护栏指标防止跑偏。',
    tags: ['指标体系', '北极星指标', '业务理解'],
    points: ['判断标准', '案例匹配', '护栏设计'],
    type: 'short_answer',
    difficulty: 'easy',
  },
  {
    suffix: 'data-warehouse-build',
    title: '讲一个你从零建设数仓模型或报表体系的项目',
    stem: '请说明业务诉求、分层设计、口径治理、与使用方的协作方式，以及上线后的使用效果。',
    answer:
      '从核心业务过程出发设计 ODS/DWD/ADS 分层，用维度建模统一口径，与业务方共建指标字典，通过使用率和取数效率提升验证价值。',
    tags: ['数仓建模', '报表体系', '数据治理'],
    points: ['分层设计', '口径治理', '使用效果'],
  },
  {
    suffix: 'data-user-profile',
    title: '用户画像标签体系如何设计与验收？',
    stem: '请说明标签的分类框架、生产方式、质量验收标准，以及如何推动业务真正使用画像。',
    answer:
      '按事实、规则、模型三类组织标签，明确每个标签的口径、更新频率与负责人，用覆盖率、准确率验收，通过圈人投放等场景闭环证明业务价值。',
    tags: ['用户画像', '标签体系'],
    points: ['分类框架', '质量验收', '业务闭环'],
    type: 'short_answer',
  },
  {
    suffix: 'data-simpson',
    title: '什么是辛普森悖论？分析时如何避免误判？',
    stem: '请解释辛普森悖论的成因，举一个业务例子，并说明分析中如何防范这类分组陷阱。',
    answer:
      '分组结论与汇总结论相反，源于组间权重差异。例如两渠道转化率都提升但大盘下降，是低转化渠道占比变大。分析时要检查结构变化，用分层对比替代简单汇总。',
    tags: ['统计思维', '数据陷阱'],
    points: ['概念解释', '业务案例', '防范方法'],
    type: 'short_answer',
    difficulty: 'hard',
  },
  {
    suffix: 'data-stakeholder',
    title: '业务方质疑你的分析结论时怎么办？',
    stem: '请结合真实经历说明你如何回应质疑：如何核实、如何沟通、最终如何达成一致。',
    answer:
      '先认真对待质疑并复核口径与数据链路，把分析假设和局限透明化，用业务方熟悉的语言重新呈现证据，若确有疏漏坦诚修正，共同确认结论边界。',
    tags: ['业务沟通', '数据可信度'],
    points: ['复核过程', '透明沟通', '共识达成'],
    type: 'behavioral',
    difficulty: 'easy',
  },
  {
    suffix: 'data-feature-engineering',
    title: '常用的特征工程方法有哪些？',
    stem: '请说明连续特征、类别特征、时间特征的常用处理方法，以及特征选择的思路。',
    answer:
      '连续特征做分箱、标准化与非线性变换；类别特征做编码与频率统计；时间特征提取周期与间隔。特征选择结合业务先验、重要性评估与线上线下一致性校验。',
    tags: ['特征工程', '机器学习'],
    points: ['处理方法', '选择思路', '一致性校验'],
    type: 'short_answer',
  },
  {
    suffix: 'data-model-decay',
    title: '模型上线后效果衰减，如何定位原因？',
    stem: '请说明如何区分数据漂移、特征异常、业务变化与模型本身问题，并给出监控与应对方案。',
    answer:
      '对比训练与线上的特征分布定位漂移，检查特征管道确认是否异常，结合业务动作判断人群变化；建立特征分布、打分分布与效果指标三层监控，制定重训与回滚策略。',
    tags: ['模型运维', 'MLOps', '监控', 'company:阿里巴巴'],
    points: ['原因区分', '监控体系', '应对策略'],
    type: 'short_answer',
    difficulty: 'hard',
  },
  {
    suffix: 'data-drive-decision',
    title: '讲一次你用数据改变业务决策的经历',
    stem: '请说明业务原定方向、你发现了什么证据、如何说服团队调整，以及调整后的结果。',
    answer:
      '用严谨的对照分析发现原方案的隐藏成本或更优机会，把结论转译成业务收益语言，通过小范围试点验证后推动全面调整，并持续跟踪结果确认判断。',
    tags: ['数据驱动', '决策影响'],
    points: ['证据发现', '说服过程', '结果验证'],
    type: 'behavioral',
  },
];
