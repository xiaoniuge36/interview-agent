import type { ProfilePayload, UpsertProfileInput } from '@interview-agent/contracts';

export type ProfileFormValue = {
  targetRole: string;
  yearsOfExperience: number;
  techStacks: string;
  resumeSummary: string;
  projectExperiences: string;
  currentLevel: string;
};

export const DEFAULT_PROFILE_FORM: ProfileFormValue = {
  targetRole: '全栈开发工程师',
  yearsOfExperience: 3,
  techStacks: 'React, TypeScript, Node.js, SQL, 产品协作',
  resumeSummary:
    '具备三年互联网产品研发经验，能够从需求拆解、方案设计到上线复盘完成端到端交付，正在持续提升系统设计和业务表达能力。',
  projectExperiences:
    '负责核心业务模块的前后端交付，梳理需求边界、设计接口与数据结构，并通过监控和复盘持续改善体验与稳定性。',
  currentLevel: '中级工程师，具备端到端交付经验',
};

export function profileFormFrom(payload: ProfilePayload): ProfileFormValue {
  const profile = payload.profile;
  if (!profile) return DEFAULT_PROFILE_FORM;
  return {
    targetRole: profile.targetRole,
    yearsOfExperience: profile.yearsOfExperience,
    techStacks: profile.techStacks.join(', '),
    resumeSummary: profile.resumeSummary,
    projectExperiences: profile.projectExperiences.join('\n'),
    currentLevel: profile.currentLevel,
  };
}

export function profileInput(form: ProfileFormValue): UpsertProfileInput {
  return {
    targetRole: form.targetRole,
    yearsOfExperience: form.yearsOfExperience,
    techStacks: splitValues(form.techStacks, /[,，]/),
    resumeSummary: form.resumeSummary,
    projectExperiences: splitValues(form.projectExperiences, /\r?\n+/),
    currentLevel: form.currentLevel,
  };
}

function splitValues(value: string, separator: RegExp): string[] {
  return value
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}
