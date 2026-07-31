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
  targetRole: '',
  yearsOfExperience: 0,
  techStacks: '',
  resumeSummary: '',
  projectExperiences: '',
  currentLevel: '',
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
