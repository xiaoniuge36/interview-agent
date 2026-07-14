import { classifyRole, type RoleCategory } from './role-category';
import { guidanceForCategory } from './role-guidance-catalog';

export type SkillWeightGuidance = {
  skill: string;
  weight: number;
  reason: string;
};

export type RoleReportGuidance = {
  summary: string;
  projectDiagnosis: string[];
  nextActions: string[];
  jdEvidence: string[];
  projectEvidence: string[];
  scenarioEvidence: string[];
  turnFeedback: string;
  missingPoints: string[];
  memoryTag: string;
  memoryEvidence: string;
};

export type RoleGuidance = {
  category: RoleCategory;
  skillWeights: SkillWeightGuidance[];
  interviewFocus: string[];
  riskSignals: string[];
  prepAdvice: string[];
  profile: {
    strengths: string[];
    weaknesses: string[];
    riskSignals: string[];
  };
  report: RoleReportGuidance;
};

export function roleGuidanceFor(roleTitle: string, context = ''): RoleGuidance {
  const category = classifyRole(roleTitle);
  const normalizedContext = [roleTitle, context].join('\n').toLowerCase();
  return guidanceForCategory(category, normalizedContext, roleTitle.trim() || '目标岗位');
}
