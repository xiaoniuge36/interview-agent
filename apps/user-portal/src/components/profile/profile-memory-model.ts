import type { ProfilePayload } from '@interview-agent/contracts';

const PROFILE_FIELD_COUNT = 6;
const MEMORY_ITEM_LIMIT = 3;
const PERCENTAGE_MAX = 100;
const EMPTY_EVIDENCE = '保存档案后，Agent 会在这里归纳你的优势证据。';
const EMPTY_FOCUS = '完成档案后，Agent 会标记下一轮需要重点练习的内容。';

export type ProfileMemoryModel = {
  completion: number;
  role: string;
  evidence: string[];
  focus: string[];
};

export function createProfileMemoryModel(payload: ProfilePayload): ProfileMemoryModel {
  const profile = payload.profile;
  if (!profile)
    return {
      completion: 0,
      role: '等待完善目标岗位',
      evidence: [EMPTY_EVIDENCE],
      focus: [EMPTY_FOCUS],
    };

  const completedFields = [
    profile.targetRole,
    true,
    profile.techStacks.length,
    profile.resumeSummary,
    profile.projectExperiences.length,
    profile.currentLevel,
  ].filter(Boolean).length;
  const analyzedEvidence = payload.snapshot?.strengths.slice(0, MEMORY_ITEM_LIMIT);
  const evidence = analyzedEvidence?.length
    ? analyzedEvidence
    : profile.techStacks.slice(0, MEMORY_ITEM_LIMIT);
  const focus = payload.snapshot?.weaknesses.slice(0, MEMORY_ITEM_LIMIT) ?? [EMPTY_FOCUS];
  return {
    completion: Math.round((completedFields / PROFILE_FIELD_COUNT) * PERCENTAGE_MAX),
    role: profile.targetRole,
    evidence: evidence.length ? evidence : [EMPTY_EVIDENCE],
    focus: focus.length ? focus : [EMPTY_FOCUS],
  };
}
