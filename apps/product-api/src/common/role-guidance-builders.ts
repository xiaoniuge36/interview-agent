import type { RoleCategory } from './role-category';
import type { RoleGuidance, RoleReportGuidance, SkillWeightGuidance } from './role-guidance';

const MAX_SKILL_WEIGHT = 95;
const JD_KEYWORD_BONUS = 8;

export type SkillWeightDefinition = {
  skill: string;
  reason: string;
  terms: string[];
  base: number;
};

type GuidanceInput = {
  category: RoleCategory;
  context: string;
  weights: SkillWeightDefinition[];
  interviewFocus: string[];
  riskSignals: string[];
  prepAdvice: string[];
  strengths: string[];
  weaknesses: string[];
  profileRisks: string[];
  report: RoleReportGuidance;
};

export function buildGuidance(input: GuidanceInput): RoleGuidance {
  return {
    category: input.category,
    skillWeights: input.weights.map((item) => weightForContext(item, input.context)),
    interviewFocus: input.interviewFocus,
    riskSignals: input.riskSignals,
    prepAdvice: input.prepAdvice,
    profile: {
      strengths: input.strengths,
      weaknesses: input.weaknesses,
      riskSignals: input.profileRisks,
    },
    report: input.report,
  };
}

export function weight(definition: SkillWeightDefinition): SkillWeightDefinition {
  return definition;
}

function weightForContext(definition: SkillWeightDefinition, context: string): SkillWeightGuidance {
  const hasMatchedTerm = definition.terms.some((term) => context.includes(term));
  const keywordBonus = hasMatchedTerm ? JD_KEYWORD_BONUS : 0;
  return {
    skill: definition.skill,
    reason: definition.reason,
    weight: Math.min(MAX_SKILL_WEIGHT, definition.base + keywordBonus),
  };
}

export function reportGuidance(input: RoleReportGuidance): RoleReportGuidance {
  return input;
}
