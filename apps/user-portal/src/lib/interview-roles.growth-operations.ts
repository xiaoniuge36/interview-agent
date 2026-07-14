import { defineRole, type RoleTemplate } from './interview-role-types';

const GROUP = '增长与运营' as const;

export const GROWTH_OPERATIONS_ROLE_TEMPLATES: RoleTemplate[] = [
  defineRole({
    group: GROUP,
    title: '增长运营',
    jdText: '负责增长策略、用户分层和活动机制运营，围绕拉新、激活、留存与转化建立可复制的增长闭环。',
    companyContext: '增长从粗放投放转向精细运营，团队需要更好地理解用户路径并提高每一环的转化效率。',
    communicationText: '结合完整案例说明目标拆解、策略选择、实验节奏和最终指标提升，体现因果判断能力。',
    focusTags: ['增长策略', '用户分层', '漏斗优化', '复盘迭代'],
  }),
  defineRole({
    group: GROUP,
    title: '内容运营',
    jdText: '负责内容策略、生产机制和分发运营，通过高质量内容建立用户认知、提升活跃并服务业务转化。',
    companyContext: '内容渠道竞争加剧，团队需要在品牌表达、生产效率和商业目标之间找到稳定的平衡。',
    communicationText: '说明选题依据、内容机制、渠道分发和效果评估，避免把阅读量当作唯一结果。',
    focusTags: ['内容策略', '用户洞察', '渠道分发', '效果评估'],
  }),
  defineRole({
    group: GROUP,
    title: '用户运营',
    jdText: '负责用户生命周期、触达策略和服务机制设计，提升用户活跃、留存、复购与长期价值。',
    companyContext: '用户规模增长后，团队需要从统一触达转向分群运营，并建立可持续的用户价值运营体系。',
    communicationText: '重点讲用户分层、触发机制、策略效果和优化过程，用数据说明对留存或转化的影响。',
    focusTags: ['用户分层', '生命周期', '触达策略', '留存提升'],
  }),
  defineRole({
    group: GROUP,
    title: '社区运营',
    jdText: '负责社区内容生态、创作者关系和治理机制建设，提升互动质量、社区活跃与核心用户留存。',
    companyContext: '社区进入规模化阶段，团队既要激励优质内容，也要控制低质内容和冲突带来的体验风险。',
    communicationText: '说明生态问题如何被识别、规则与活动如何设计，以及如何平衡增长、秩序和用户感受。',
    focusTags: ['社区生态', '内容治理', '用户激励', '风险处理'],
  }),
  defineRole({
    group: GROUP,
    title: '投放运营',
    jdText: '负责广告投放策略、渠道优化和归因分析，通过预算配置、素材迭代和实验提升获客效率与 ROI。',
    companyContext: '获客成本持续上升，团队需要识别高价值渠道与用户，并让投放结果与后续转化价值相连接。',
    communicationText: '重点阐述预算判断、素材与人群实验、归因口径和规模化策略，不只呈现消耗数据。',
    focusTags: ['渠道策略', '归因分析', '素材实验', 'ROI 优化'],
  }),
  defineRole({
    group: GROUP,
    title: '电商运营',
    jdText: '负责商品、活动、店铺和用户运营，通过供给优化、转化提升与复购经营驱动电商业务增长。',
    companyContext: '电商业务需要同时改善流量、商品效率与履约体验，团队希望形成可复用的经营方法。',
    communicationText: '结合大促或日常经营案例说明目标拆解、策略组合、关键数据和异常问题的处理过程。',
    focusTags: ['商品运营', '活动策划', '转化提升', '经营分析'],
  }),
];