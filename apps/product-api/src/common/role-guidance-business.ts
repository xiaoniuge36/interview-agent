import type { RoleGuidance } from './role-guidance';
import { buildGuidance, reportGuidance, weight } from './role-guidance-builders';
import {
  BASE_WEIGHT_78,
  BASE_WEIGHT_82,
  BASE_WEIGHT_84,
  BASE_WEIGHT_86,
} from './role-guidance-weights';

const BUSINESS_DELIVERY_WEIGHTS = [
  weight({
    skill: '客户与业务目标',
    reason: '需要先讲清客户场景、关键目标与成功标准。',
    terms: ['客户', '目标', '业务', '经营'],
    base: BASE_WEIGHT_84,
  }),
  weight({
    skill: '价值方案设计',
    reason: '需要说明如何把需求转化为可落地的价值方案。',
    terms: ['方案', '价值', '需求', '产品'],
    base: BASE_WEIGHT_82,
  }),
  weight({
    skill: '干系人协同',
    reason: '需要体现跨客户、销售、产品和交付团队的协同方式。',
    terms: ['协同', '沟通', '客户', '销售'],
    base: BASE_WEIGHT_78,
  }),
  weight({
    skill: '交付与经营结果',
    reason: '需要用交付质量、续约、收入或满意度证明结果。',
    terms: ['交付', '续约', '收入', '满意度'],
    base: BASE_WEIGHT_86,
  }),
];

export function businessDeliveryGuidance(context: string, roleTitle: string): RoleGuidance {
  return buildGuidance({
    category: 'business_delivery',
    context,
    weights: BUSINESS_DELIVERY_WEIGHTS,
    interviewFocus: ['客户与业务目标', '价值方案设计', '干系人协同', '交付与经营结果'],
    riskSignals: ['只介绍流程或关系维护，缺少客户价值、风险判断和经营结果。'],
    prepAdvice: ['准备一段完整客户场景', '说明价值方案与关键取舍', '补充交付风险和经营结果'],
    strengths: ['具备客户问题与业务目标意识', '能够关联方案、协作与结果', '有沉淀可复制方法的基础'],
    weaknesses: ['需要更明确地说明方案价值与关键干系人判断', '需要补充交付质量、续约或经营指标'],
    profileRisks: ['只强调执行过程而缺少客户价值和结果证据，会削弱商业化岗位匹配度。'],
    report: reportGuidance({
      summary: `${roleTitle}的客户与业务表达已有基础，还需要用价值方案、协同判断和经营结果增强说服力。`,
      projectDiagnosis: [
        '能够描述客户场景与协作过程。',
        '建议补充价值方案、关键风险和可验证的经营结果。',
      ],
      nextActions: [
        '准备一个客户价值案例',
        '梳理关键干系人与协同策略',
        '补充交付、续约或满意度指标',
      ],
      jdEvidence: ['能识别客户目标', '能说明价值方案与协作方式'],
      projectEvidence: ['需要补充交付质量、续约或业务结果'],
      scenarioEvidence: ['需要更清楚地说明方案取舍和风险控制'],
      turnFeedback: '回答具备客户导向，建议补充价值方案、关键协同、交付风险和经营结果。',
      missingPoints: ['客户价值', '方案取舍', '经营结果'],
      memoryTag: '商业交付表达',
      memoryEvidence: '本场训练显示客户价值与经营结果表达仍可继续强化。',
    }),
  });
}
