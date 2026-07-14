import type { RoleGuidance } from './role-guidance';
import { buildGuidance, reportGuidance, weight } from './role-guidance-builders';
import {
  BASE_WEIGHT_74,
  BASE_WEIGHT_78,
  BASE_WEIGHT_80,
  BASE_WEIGHT_82,
  BASE_WEIGHT_84,
  BASE_WEIGHT_86,
  BASE_WEIGHT_88,
} from './role-guidance-weights';

const ENGINEERING_SKILL_WEIGHTS = [
  weight({
    skill: '系统设计',
    reason: '需要讲清服务、数据或模块边界。',
    terms: ['架构', '系统', '服务', '数据库'],
    base: BASE_WEIGHT_82,
  }),
  weight({
    skill: '工程质量',
    reason: '需要说明测试、规范与上线保障。',
    terms: ['测试', '质量', 'ci', '发布'],
    base: BASE_WEIGHT_78,
  }),
  weight({
    skill: '稳定性与性能',
    reason: '需要用容量、性能或故障治理案例证明。',
    terms: ['性能', '稳定', '可用', '故障'],
    base: BASE_WEIGHT_80,
  }),
  weight({
    skill: '协作交付',
    reason: '需要说明如何推进跨角色协作与结果验收。',
    terms: ['协作', '交付', '产品', '设计'],
    base: BASE_WEIGHT_74,
  }),
];

export function engineeringGuidance(context: string, roleTitle: string): RoleGuidance {
  return buildGuidance({
    category: 'engineering',
    context,
    weights: ENGINEERING_SKILL_WEIGHTS,
    interviewFocus: ['系统设计', '工程质量', '稳定性与性能', '协作交付'],
    riskSignals: ['只描述技术方案而缺少业务影响、风险取舍和量化结果。'],
    prepAdvice: ['准备一段完整项目链路', '补充性能或稳定性指标', '说明关键技术取舍'],
    strengths: ['具备工程化与交付意识', '能够关注需求到上线的完整链路', '有跨团队协作的表达基础'],
    weaknesses: ['需要用系统边界和取舍讲清关键方案', '需要补充性能、稳定性或质量指标的证据'],
    profileRisks: ['只讲实现细节而不说明业务结果，容易削弱岗位匹配度。'],
    report: reportGuidance({
      summary: roleTitle + '的核心能力表达已有基础，还需要用工程取舍和业务结果增强说服力。',
      projectDiagnosis: [
        '能够从项目中说明关键模块与协作方式。',
        '建议补充可复现的技术判断与量化结果。',
      ],
      nextActions: ['补一份系统方案或架构图', '准备性能或稳定性指标', '复盘一次关键技术取舍'],
      jdEvidence: ['能拆分模块边界', '能说明工程质量策略'],
      projectEvidence: ['需要补充性能、稳定性或质量指标'],
      scenarioEvidence: ['需要更清楚地说明风险识别和方案取舍'],
      turnFeedback: '回答方向清晰，建议补充场景、决策依据、量化结果和复盘。',
      missingPoints: ['关键约束', '技术取舍', '结果指标'],
      memoryTag: '工程方案表达',
      memoryEvidence: '本场训练显示工程方案与结果表达仍可继续强化。',
    }),
  });
}

const DATA_SKILL_WEIGHTS = [
  weight({
    skill: '问题定义',
    reason: '需要把业务问题转化为可验证的数据问题。',
    terms: ['指标', '问题', '业务'],
    base: BASE_WEIGHT_80,
  }),
  weight({
    skill: '方法与实验',
    reason: '需要说明分析、建模或实验设计方法。',
    terms: ['实验', '模型', '分析', '算法'],
    base: BASE_WEIGHT_84,
  }),
  weight({
    skill: '数据质量',
    reason: '需要覆盖口径、样本、偏差和数据质量。',
    terms: ['口径', '数据质量', '样本', '偏差'],
    base: BASE_WEIGHT_82,
  }),
  weight({
    skill: '效果评估',
    reason: '需要展示结论如何支持业务决策。',
    terms: ['效果', '评估', '提升', '转化'],
    base: BASE_WEIGHT_78,
  }),
];

export function dataGuidance(context: string, roleTitle: string): RoleGuidance {
  return buildGuidance({
    category: 'data',
    context,
    weights: DATA_SKILL_WEIGHTS,
    interviewFocus: ['问题定义', '方法与实验设计', '数据质量', '效果评估'],
    riskSignals: ['只展示结论而没有说明数据口径、方法选择和业务落地。'],
    prepAdvice: [
      '准备一个完整分析或实验案例',
      '梳理指标口径与数据质量风险',
      '说明结论如何推动业务动作',
    ],
    strengths: ['具备数据驱动的分析意识', '能够关注业务问题和结果评估', '有方法论沉淀空间'],
    weaknesses: ['需要更清楚地说明数据口径和方法选择', '需要补充分析或实验带来的业务结果'],
    profileRisks: ['忽略样本、口径或偏差说明，会降低结论可信度。'],
    report: reportGuidance({
      summary: roleTitle + '的分析思路具备基础，还需要增强方法选择与业务影响的证据链。',
      projectDiagnosis: ['能够围绕问题和指标展开分析。', '建议补充方法选择、验证过程和业务动作。'],
      nextActions: ['准备一份分析或实验案例', '梳理指标口径与样本边界', '补充业务结果和复盘'],
      jdEvidence: ['能说明业务问题', '能关联指标与方法'],
      projectEvidence: ['需要补充数据质量、样本或口径说明'],
      scenarioEvidence: ['需要更明确地说明结果如何验证和落地'],
      turnFeedback: '回答有分析框架，建议补充数据依据、方法取舍和业务结果。',
      missingPoints: ['数据口径', '方法选择', '结果验证'],
      memoryTag: '数据分析表达',
      memoryEvidence: '本场训练显示问题定义与结果评估表达仍可继续强化。',
    }),
  });
}

const AI_AGENT_SKILL_WEIGHTS = [
  weight({
    skill: 'Agent 方案设计',
    reason: '需要说明工作流、工具与状态边界。',
    terms: ['agent', 'langgraph', 'workflow'],
    base: BASE_WEIGHT_88,
  }),
  weight({
    skill: '知识与工具治理',
    reason: '需要覆盖检索、权限和工具调用约束。',
    terms: ['rag', '检索', '权限', '工具'],
    base: BASE_WEIGHT_86,
  }),
  weight({
    skill: '评估与可观测',
    reason: '需要说明评估集、追踪和失败治理。',
    terms: ['eval', '评估', 'trace', '观测'],
    base: BASE_WEIGHT_84,
  }),
  weight({
    skill: '业务落地',
    reason: '需要连接用户价值与业务结果。',
    terms: ['用户', '业务', '转化', '效率'],
    base: BASE_WEIGHT_78,
  }),
];

export function agentGuidance(context: string, roleTitle: string): RoleGuidance {
  return buildGuidance({
    category: 'ai_agent',
    context,
    weights: AI_AGENT_SKILL_WEIGHTS,
    interviewFocus: ['Agent 方案设计', '知识与工具治理', '评估与可观测', '业务落地'],
    riskSignals: ['只展示提示词或 Demo，而没有解释状态、权限和效果治理。'],
    prepAdvice: ['准备端到端工作流图', '准备权限或工具治理案例', '准备评估与失败恢复案例'],
    strengths: ['具备 AI 应用落地意识', '能够关注产品体验与工程实现', '有端到端方案表达基础'],
    weaknesses: ['需要更结构化地说明工作流与状态边界', '需要补充评估、可观测和失败恢复证据'],
    profileRisks: ['未说明治理与评估机制时，容易被认为只是提示词 Demo。'],
    report: reportGuidance({
      summary: roleTitle + '的方案表达具备基础，还需要强化治理、评估和业务结果的证据链。',
      projectDiagnosis: [
        '能够描述 AI 应用的产品与工程结合。',
        '建议补充状态边界、评估和失败恢复案例。',
      ],
      nextActions: ['补一张工作流与状态图', '准备权限或工具治理案例', '补充评估与失败恢复说明'],
      jdEvidence: ['能说明工作流边界', '能关联产品体验与工程实现'],
      projectEvidence: ['需要补充评估、可观测或权限治理证据'],
      scenarioEvidence: ['需要更明确地说明失败恢复和效果验证'],
      turnFeedback: '回答方向正确，建议补充状态边界、治理方式、评估指标和业务结果。',
      missingPoints: ['工作流状态', '治理机制', '效果评估'],
      memoryTag: 'AI 方案表达',
      memoryEvidence: '本场训练显示 AI 方案治理与效果表达仍可继续强化。',
    }),
  });
}
