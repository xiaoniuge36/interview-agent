import { defineRole, type RoleTemplate } from './interview-role-types';

const GROUP = '产品与设计' as const;

export const PRODUCT_DESIGN_ROLE_TEMPLATES: RoleTemplate[] = [
  defineRole({
    group: GROUP,
    title: '产品经理',
    jdText: '负责从用户问题、业务目标到产品方案和上线复盘的完整闭环，协调研发、设计与运营推动结果达成。',
    companyContext: '核心业务进入精细化增长阶段，团队希望用清晰的优先级和可验证方案提升关键链路转化。',
    communicationText: '用真实项目说明问题洞察、方案取舍、跨团队协作、指标设计以及上线后的结果与反思。',
    focusTags: ['需求洞察', '方案设计', '优先级判断', '业务结果'],
  }),
  defineRole({
    group: GROUP,
    title: '增长产品经理',
    jdText: '负责增长漏斗、实验机制和产品策略设计，持续提升拉新、激活、留存、转化或复购等关键指标。',
    companyContext: '业务增长遇到瓶颈，团队需要将用户洞察、产品机制和运营动作组合成可持续的增长系统。',
    communicationText: '重点呈现实验假设、指标拆解、迭代节奏和因果判断，说明增长不是单次活动结果。',
    focusTags: ['增长模型', '实验设计', '漏斗分析', '策略迭代'],
  }),
  defineRole({
    group: GROUP,
    title: '用户研究员',
    jdText: '负责定性与定量用户研究，发现行为背后的真实动机，并把研究洞察转化为产品与体验的决策依据。',
    companyContext: '团队需要更准确地理解目标用户，避免仅凭内部判断决定产品方向和体验优先级。',
    communicationText: '说明研究问题、样本选择、方法取舍、洞察提炼及其如何影响后续产品或设计决策。',
    focusTags: ['研究设计', '用户洞察', '方法论', '影响力'],
  }),
  defineRole({
    group: GROUP,
    title: 'UX/UI 设计师',
    jdText: '负责复杂业务流程的用户体验与界面设计，通过信息架构、交互细节和视觉层级提升可用性与转化。',
    companyContext: '产品功能持续增多，团队需要在保持品牌一致性的同时降低学习成本并提升任务完成效率。',
    communicationText: '用设计过程讲清问题、调研、方案比较、可用性验证和上线后的体验数据或用户反馈。',
    focusTags: ['信息架构', '交互设计', '可用性', '设计验证'],
  }),
  defineRole({
    group: GROUP,
    title: '视觉设计师',
    jdText: '负责品牌视觉、营销素材和产品视觉规范建设，让关键传播与产品触点形成一致、有辨识度的表达。',
    companyContext: '品牌需要在多渠道持续曝光，团队希望通过统一视觉系统提升认知效率和高质量产出效率。',
    communicationText: '说明品牌策略如何转化为视觉系统，展示你对一致性、转化目标和多场景落地的把控。',
    focusTags: ['品牌表达', '视觉系统', '营销设计', '一致性'],
  }),
  defineRole({
    group: GROUP,
    title: '交互设计师',
    jdText: '负责高频或复杂任务的交互流程设计，通过状态反馈、异常处理和原型验证降低用户完成任务的阻力。',
    companyContext: '业务流程包含较多角色与分支，团队需要让用户在关键操作中获得清晰、可预期的反馈。',
    communicationText: '重点说明任务流拆解、边界状态、原型验证和与研发协作的细节，而非只展示最终界面。',
    focusTags: ['任务流', '状态设计', '原型验证', '协作落地'],
  }),
];