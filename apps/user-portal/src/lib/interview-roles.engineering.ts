import { defineRole, type RoleTemplate } from './interview-role-types';

const GROUP = '工程研发' as const;

export const ENGINEERING_ROLE_TEMPLATES: RoleTemplate[] = [
  defineRole({
    group: GROUP,
    title: '前端开发工程师',
    jdText: '负责核心 Web 业务的页面架构、性能优化和交付质量，与设计、产品及后端共同推进复杂业务上线。',
    companyContext: '业务正从单一产品扩展到多端协同，团队需要在快速迭代中保持体验一致性和可维护性。',
    communicationText: '重点说明你如何拆解需求、处理复杂状态、定位性能瓶颈，并量化最终的业务与体验结果。',
    focusTags: ['系统设计', '性能优化', '跨团队协作', '项目复盘'],
  }),
  defineRole({
    group: GROUP,
    title: '后端开发工程师',
    jdText: '负责高并发业务接口、数据模型和服务稳定性建设，持续优化领域设计、可观测性与故障恢复能力。',
    companyContext: '核心交易链路正在增长，团队需要在性能、可靠性、成本与研发效率之间建立可持续的平衡。',
    communicationText: '使用真实案例说明架构取舍、容量预估、异常处理和事故复盘，避免只罗列技术名词。',
    focusTags: ['系统设计', '高并发', '稳定性', '故障复盘'],
  }),
  defineRole({
    group: GROUP,
    title: '全栈开发工程师',
    jdText: '负责从前端体验、服务接口到数据闭环的端到端交付，能快速验证业务假设并沉淀通用能力。',
    companyContext: '新业务仍在探索阶段，团队需要用最小可行方案快速上线，同时控制后续演进成本。',
    communicationText: '清晰呈现你如何界定边界、协调多端依赖、保证质量，并把项目结果转换为可复用经验。',
    focusTags: ['端到端交付', '架构取舍', '质量保障', '业务理解'],
  }),
  defineRole({
    group: GROUP,
    title: '数据库工程师',
    jdText: '负责数据库建模、SQL 调优、备份恢复与容量治理，保障关键数据链路的性能、可靠性和合规性。',
    companyContext: '数据规模持续增长，团队需要降低查询延迟和故障风险，并为业务分析与服务扩展提供稳定底座。',
    communicationText: '结合具体场景讲清索引设计、慢查询诊断、主从或分片取舍，以及恢复演练的验证方式。',
    focusTags: ['数据建模', 'SQL 调优', '容量治理', '可靠性'],
  }),
  defineRole({
    group: GROUP,
    title: '测试开发工程师',
    jdText: '负责测试策略、自动化平台和质量度量建设，通过风险识别与工程化手段提升版本交付的确定性。',
    companyContext: '产品迭代频繁且多团队并行，团队希望把质量保障从发布前检验前移到整个研发过程。',
    communicationText: '重点描述你如何设计测试分层、识别高风险链路、建设自动化能力并用数据证明质量改善。',
    focusTags: ['测试策略', '自动化测试', '质量度量', '风险识别'],
  }),
  defineRole({
    group: GROUP,
    title: 'SRE / DevOps 工程师',
    jdText: '负责云资源、CI/CD、可观测性和应急响应体系，持续提升系统可用性、交付效率与运行成本效率。',
    companyContext: '服务数量和发布频次都在增长，团队需要建立标准化的运行体系来控制变更与故障风险。',
    communicationText: '用可用性指标、发布流程和真实事件复盘说明你如何降低 MTTR、改善变更成功率并推动治理。',
    focusTags: ['可观测性', 'CI/CD', '故障响应', '成本治理'],
  }),
];