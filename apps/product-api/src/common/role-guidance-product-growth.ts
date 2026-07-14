import type { RoleGuidance } from './role-guidance';
import { buildGuidance, reportGuidance, weight } from './role-guidance-builders';
import {
  BASE_WEIGHT_74,
  BASE_WEIGHT_76,
  BASE_WEIGHT_78,
  BASE_WEIGHT_80,
  BASE_WEIGHT_82,
  BASE_WEIGHT_84,
} from './role-guidance-weights';

const PRODUCT_DESIGN_SKILL_WEIGHTS = [
  weight({
    skill: '用户与业务洞察',
    reason: '需要说明用户问题和业务机会。',
    terms: ['用户', '需求', '业务', '场景'],
    base: BASE_WEIGHT_84,
  }),
  weight({
    skill: '需求拆解',
    reason: '需要展示目标、范围与优先级判断。',
    terms: ['需求', '优先级', '目标', '方案'],
    base: BASE_WEIGHT_82,
  }),
  weight({
    skill: '方案取舍',
    reason: '需要解释取舍、风险和验证路径。',
    terms: ['取舍', '风险', '方案', '验证'],
    base: BASE_WEIGHT_80,
  }),
  weight({
    skill: '跨团队推进',
    reason: '需要体现与研发、设计或运营的协作。',
    terms: ['协作', '研发', '设计', '运营'],
    base: BASE_WEIGHT_78,
  }),
];

export function productGuidance(context: string, roleTitle: string): RoleGuidance {
  return buildGuidance({
    category: 'product_design',
    context,
    weights: PRODUCT_DESIGN_SKILL_WEIGHTS,
    interviewFocus: ['用户与业务洞察', '需求拆解', '方案取舍', '跨团队推进'],
    riskSignals: ['只罗列功能而没有讲清用户问题、优先级和结果验证。'],
    prepAdvice: ['准备一个从洞察到上线的案例', '说清优先级与方案取舍', '补充指标验证和复盘'],
    strengths: ['具备用户与业务视角', '能够从目标拆解方案', '有跨团队协作的表达基础'],
    weaknesses: ['需要更具体地说明优先级和方案取舍', '需要补充上线后的指标验证与复盘'],
    profileRisks: ['缺少用户证据和结果指标时，容易显得停留在功能描述。'],
    report: reportGuidance({
      summary: roleTitle + '的业务思考具有基础，还需要用用户证据、取舍过程和结果验证增强说服力。',
      projectDiagnosis: [
        '能够从用户和业务目标出发描述方案。',
        '建议补充优先级判断、协同方式和上线结果。',
      ],
      nextActions: ['准备一段完整产品案例', '梳理优先级与关键取舍', '补充指标验证和复盘'],
      jdEvidence: ['能识别用户或业务问题', '能拆解目标与方案'],
      projectEvidence: ['需要补充优先级和用户证据'],
      scenarioEvidence: ['需要更明确地说明验证方案和跨团队推进'],
      turnFeedback: '回答有业务方向，建议补充用户证据、优先级判断、取舍和结果。',
      missingPoints: ['用户证据', '优先级判断', '验证结果'],
      memoryTag: '产品判断表达',
      memoryEvidence: '本场训练显示用户洞察与方案取舍表达仍可继续强化。',
    }),
  });
}

const GROWTH_OPERATIONS_SKILL_WEIGHTS = [
  weight({
    skill: '用户分层',
    reason: '需要说明目标人群、行为和生命周期判断。',
    terms: ['用户', '分层', '人群', '生命周期'],
    base: BASE_WEIGHT_82,
  }),
  weight({
    skill: '指标分析',
    reason: '需要围绕漏斗、转化或经营指标展开。',
    terms: ['指标', '漏斗', '转化', '留存'],
    base: BASE_WEIGHT_84,
  }),
  weight({
    skill: '策略实验',
    reason: '需要说明策略设计、实验与迭代方式。',
    terms: ['实验', '策略', '活动', '增长'],
    base: BASE_WEIGHT_82,
  }),
  weight({
    skill: '协同推进',
    reason: '需要说明资源整合与项目复盘。',
    terms: ['协作', '项目', '资源', '复盘'],
    base: BASE_WEIGHT_76,
  }),
];

export function growthGuidance(context: string, roleTitle: string): RoleGuidance {
  return buildGuidance({
    category: 'growth_operations',
    context,
    weights: GROWTH_OPERATIONS_SKILL_WEIGHTS,
    interviewFocus: ['用户分层', '指标分析', '策略实验', '协同推进'],
    riskSignals: ['只描述活动动作而没有说明目标人群、指标和投入产出。'],
    prepAdvice: [
      '准备一个完整运营或增长项目',
      '梳理用户分层与指标漏斗',
      '补充实验结果和投入产出复盘',
    ],
    strengths: ['具备用户和经营结果意识', '能够围绕指标拆解行动', '有协同推进的表达基础'],
    weaknesses: ['需要更清楚地说明人群策略和实验设计', '需要补充投入产出与长期效果的证据'],
    profileRisks: ['缺少目标人群、指标基线和复盘时，策略价值难以判断。'],
    report: reportGuidance({
      summary: roleTitle + '的策略表达具备基础，还需要通过用户分层、实验过程和经营结果建立证据链。',
      projectDiagnosis: [
        '能够围绕目标和指标描述运营动作。',
        '建议补充人群策略、实验设计和投入产出复盘。',
      ],
      nextActions: ['准备一段运营或增长项目', '梳理指标漏斗与目标人群', '补充实验结果和投入产出'],
      jdEvidence: ['能识别用户或经营目标', '能关联策略与指标'],
      projectEvidence: ['需要补充用户分层与实验设计'],
      scenarioEvidence: ['需要更明确地说明投入产出和长期效果'],
      turnFeedback: '回答有策略意识，建议补充目标人群、指标基线、实验结果和复盘。',
      missingPoints: ['目标人群', '实验设计', '投入产出'],
      memoryTag: '运营策略表达',
      memoryEvidence: '本场训练显示用户分层与经营复盘表达仍可继续强化。',
    }),
  });
}

const GENERIC_SKILL_WEIGHTS = [
  weight({
    skill: '业务理解',
    reason: '需要说明目标、场景和业务价值。',
    terms: ['业务', '用户', '目标'],
    base: BASE_WEIGHT_78,
  }),
  weight({
    skill: '结构化表达',
    reason: '需要用背景、行动和结果组织回答。',
    terms: ['项目', '结果', '行动'],
    base: BASE_WEIGHT_76,
  }),
  weight({
    skill: '协作推进',
    reason: '需要体现沟通、协作和问题解决。',
    terms: ['协作', '推进', '沟通'],
    base: BASE_WEIGHT_74,
  }),
  weight({
    skill: '结果复盘',
    reason: '需要说明结果、反思与下一步。',
    terms: ['结果', '复盘', '指标'],
    base: BASE_WEIGHT_76,
  }),
];

export function genericGuidance(context: string, roleTitle: string): RoleGuidance {
  return buildGuidance({
    category: 'generic',
    context,
    weights: GENERIC_SKILL_WEIGHTS,
    interviewFocus: ['业务理解', '结构化表达', '协作推进', '结果复盘'],
    riskSignals: ['表达缺少具体场景、行动细节和可验证结果。'],
    prepAdvice: ['准备一个代表性项目', '按背景、行动和结果组织回答', '补充关键协作与复盘'],
    strengths: ['有可迁移的项目表达基础', '能够关注协作与结果', '具备继续训练的清晰方向'],
    weaknesses: ['需要让项目表达更具体、可验证', '需要补充关键行动和量化结果'],
    profileRisks: ['回答过于笼统时，面试官难以判断真实贡献。'],
    report: reportGuidance({
      summary: roleTitle + '的基础表达具备可提升空间，建议用更具体的项目证据建立说服力。',
      projectDiagnosis: ['能够围绕经历和结果展开回答。', '建议补充场景、行动、协作和量化结果。'],
      nextActions: ['准备一个代表性项目', '按背景、行动、结果重写回答', '补充关键协作和复盘'],
      jdEvidence: ['能描述项目背景', '能说明部分行动过程'],
      projectEvidence: ['需要补充具体贡献与结果'],
      scenarioEvidence: ['需要更明确地说明问题判断和协作推进'],
      turnFeedback: '回答方向清晰，建议补充具体场景、个人贡献、结果和复盘。',
      missingPoints: ['个人贡献', '量化结果', '复盘反思'],
      memoryTag: '结构化表达',
      memoryEvidence: '本场训练显示项目表达与结果复盘仍可继续强化。',
    }),
  });
}
