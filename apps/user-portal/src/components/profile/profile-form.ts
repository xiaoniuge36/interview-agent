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
  targetRole: 'AI Agent 应用开发工程师',
  yearsOfExperience: 3,
  techStacks: 'React, Next.js, TypeScript, RAG, Agent Runtime',
  resumeSummary:
    '具备三年前后端研发经验，正在系统提升 AI Agent 应用工程能力，熟悉 RAG、状态机、接口契约与可观测性实践。',
  projectExperiences:
    '负责面试训练系统的 Product API、Web 工作台与 Agent Runtime 集成，建立权限、审计和流式事件链路。',
  currentLevel: '中级全栈与 AI 应用工程师',
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
