import { defineRole, type RoleTemplate } from './interview-role-types';

const GROUP = '市场与商业' as const;

export const MARKET_COMMERCIAL_ROLE_TEMPLATES: RoleTemplate[] = [
  defineRole({
    group: GROUP,
    title: '市场营销经理',
    jdText: '负责市场策略、整合传播和活动运营，结合目标人群与渠道资源提升品牌认知、线索质量和业务影响。',
    companyContext: '业务需要在竞争加剧的市场中建立清晰心智，团队希望将传播动作与获客和转化结果连接起来。',
    communicationText: '讲清市场问题、受众洞察、渠道组合、资源取舍和效果复盘，体现策略与执行的连贯性。',
    focusTags: ['市场策略', '整合传播', '渠道组合', '效果复盘'],
  }),
  defineRole({
    group: GROUP,
    title: '品牌营销经理',
    jdText: '负责品牌定位、内容叙事与品牌资产建设，持续提升目标人群对产品价值和差异化的认知。',
    companyContext: '品牌正从单点活动走向长期建设，团队需要在一致表达与业务增长之间建立有效联动。',
    communicationText: '说明定位如何形成、创意如何服务策略、不同渠道如何协同，以及如何评估长期品牌效果。',
    focusTags: ['品牌定位', '内容叙事', '创意策略', '品牌衡量'],
  }),
  defineRole({
    group: GROUP,
    title: '销售经理',
    jdText: '负责客户开发、商机推进和团队协同，通过清晰的销售策略、客户洞察和过程管理达成营收目标。',
    companyContext: '销售周期较长且客户决策角色复杂，团队需要提升重点行业突破能力和可预测的成交效率。',
    communicationText: '用真实商机说明客户识别、需求挖掘、异议处理、内部协同与结果复盘，避免只报业绩数字。',
    focusTags: ['商机管理', '客户洞察', '谈判推进', '结果达成'],
  }),
  defineRole({
    group: GROUP,
    title: '商务拓展（BD）',
    jdText: '负责外部合作、生态资源和商业模式拓展，识别高价值伙伴并推动合作从谈判走向可持续结果。',
    companyContext: '业务希望通过合作快速扩大覆盖与能力边界，团队需要控制合作成本并验证长期价值。',
    communicationText: '说明目标伙伴筛选、合作方案、利益平衡、风险判断和合作效果，不把签约当作唯一终点。',
    focusTags: ['合作策略', '资源整合', '商业谈判', '风险判断'],
  }),
  defineRole({
    group: GROUP,
    title: '客户成功经理',
    jdText: '负责客户价值实现、续约增购和问题协调，把产品使用、业务成果和客户关系沉淀为长期合作。',
    companyContext: '客户规模扩大后，团队需要更主动地识别风险、提升活跃和续约，并建立规模化服务机制。',
    communicationText: '结合客户案例说明目标对齐、价值证明、风险预警、跨部门推动和最终续约或增购结果。',
    focusTags: ['客户价值', '续约增购', '风险预警', '跨部门协同'],
  }),
  defineRole({
    group: GROUP,
    title: '商业化运营',
    jdText: '负责商业化产品、客户需求和运营策略协同，持续提升供给效率、变现转化与客户长期价值。',
    companyContext: '业务进入变现精细化阶段，团队需要平衡用户体验、商业收入和供给生态的长期健康。',
    communicationText: '重点展示你如何拆解收入目标、设计策略、联动产品销售和运营，并量化经营改善。',
    focusTags: ['商业策略', '收入增长', '供给运营', '经营复盘'],
  }),
];