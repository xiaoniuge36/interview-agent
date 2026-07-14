import { defineRole, type RoleTemplate } from './interview-role-types';

const GROUP = '项目与交付' as const;

export const PROJECT_DELIVERY_ROLE_TEMPLATES: RoleTemplate[] = [
  defineRole({
    group: GROUP,
    title: '项目经理',
    jdText: '负责跨团队项目规划、风险管理和交付节奏，确保关键目标、资源依赖与质量标准在复杂协作中落地。',
    companyContext: '项目涉及多个业务与技术团队，团队需要更早识别依赖和风险，提升交付的确定性与透明度。',
    communicationText: '完整描述目标、里程碑、风险应对、沟通机制和最终结果，体现推动而非单纯跟进能力。',
    focusTags: ['项目规划', '风险管理', '干系人协同', '交付复盘'],
  }),
  defineRole({
    group: GROUP,
    title: '技术项目经理',
    jdText: '负责技术项目的范围、依赖、质量和上线协同，能够在业务目标与工程约束之间推动可执行的方案。',
    companyContext: '平台化或基础设施项目依赖复杂，团队需要让研发节奏、技术风险和业务窗口保持有效对齐。',
    communicationText: '重点呈现技术理解、依赖拆解、风险决策和应急推进，清楚说明你如何建立可信的交付计划。',
    focusTags: ['技术理解', '依赖管理', '风险决策', '上线协同'],
  }),
  defineRole({
    group: GROUP,
    title: '售前顾问',
    jdText: '负责客户需求澄清、方案演示与销售支持，把复杂产品能力转化为客户可理解、可决策的业务价值。',
    companyContext: '重点客户决策链较长，团队需要在方案匹配、技术可信度和商务节奏之间提高赢单效率。',
    communicationText: '用具体项目说明需求访谈、痛点提炼、方案表达、竞品应对和与销售交付的协同方式。',
    focusTags: ['需求澄清', '方案表达', '客户沟通', '赢单支持'],
  }),
  defineRole({
    group: GROUP,
    title: '解决方案架构师',
    jdText: '负责面向客户的整体解决方案设计，统筹业务流程、技术架构、集成边界和交付可行性。',
    companyContext: '客户场景多样且系统复杂，团队需要给出有差异化、能落地并可长期演进的解决方案。',
    communicationText: '说明如何从业务问题到架构方案进行取舍，覆盖集成风险、性能安全和价值证明。',
    focusTags: ['方案架构', '业务建模', '技术取舍', '客户价值'],
  }),
  defineRole({
    group: GROUP,
    title: '实施顾问',
    jdText: '负责客户上线、配置实施、培训和问题闭环，帮助客户在既定范围内快速获得可验证的业务价值。',
    companyContext: '多个客户并行交付，团队需要在标准化方法与个性化需求之间保持效率、质量和客户满意度。',
    communicationText: '描述实施计划、需求变更、关键问题处理和验收结果，突出主动管理预期与风险的能力。',
    focusTags: ['实施规划', '需求管理', '问题闭环', '客户满意'],
  }),
  defineRole({
    group: GROUP,
    title: '交付经理',
    jdText: '负责交付团队、客户预期和项目经营协同，确保项目按质量、成本、周期和价值目标稳定交付。',
    companyContext: '交付项目规模扩大，团队需要建立标准流程、风险预警和资源统筹机制来提高经营质量。',
    communicationText: '用端到端案例讲清交付策略、资源安排、风险处置、客户沟通和可量化的经营结果。',
    focusTags: ['交付经营', '资源统筹', '客户预期', '风险预警'],
  }),
];