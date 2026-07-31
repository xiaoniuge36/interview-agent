import type { ProfilePayload } from '@interview-agent/contracts';

const PROFILE_FIELD_COUNT = 6;
const MEMORY_ITEM_LIMIT = 3;
const PERCENTAGE_MAX = 100;
const EMPTY_EVIDENCE = '保存档案后，Agent 会在这里归纳你的优势证据。';
const EMPTY_FOCUS = '完成档案后，Agent 会标记下一轮需要重点练习的内容。';

export type ProfileMemoryModel = {
  completion: number | null;
  readinessLabel: string;
  primaryGap: string | null;
  nextAction: { href: string; label: string };
  role: string;
  evidence: string[];
  focus: string[];
  acceptedSignals: string[];
  nextSteps: string[];
  trainingImpact: string;
};

export function createProfileMemoryModel(payload: ProfilePayload): ProfileMemoryModel {
  const profile = payload.profile;
  if (!profile)
    return {
      completion: null,
      readinessLabel: '待开始',
      primaryGap: '目标岗位',
      nextAction: { href: '#profile-target-role', label: '先填写目标岗位' },
      role: '等待完善目标岗位',
      evidence: [EMPTY_EVIDENCE],
      focus: [EMPTY_FOCUS],
      ...trainingSignals(profile),
    };

  const analyzedEvidence = payload.snapshot?.strengths.slice(0, MEMORY_ITEM_LIMIT);
  const evidence = analyzedEvidence?.length
    ? analyzedEvidence
    : profile.techStacks.slice(0, MEMORY_ITEM_LIMIT);
  const focus = payload.snapshot?.weaknesses.slice(0, MEMORY_ITEM_LIMIT) ?? [EMPTY_FOCUS];
  return {
    ...createProfileReadiness(profile),
    role: profile.targetRole,
    evidence: evidence.length ? evidence : [EMPTY_EVIDENCE],
    focus: focus.length ? focus : [EMPTY_FOCUS],
    ...trainingSignals(profile),
  };
}

function createProfileReadiness(profile: NonNullable<ProfilePayload['profile']>) {
  const fields = [
    { ready: Boolean(profile.targetRole.trim()), label: '目标岗位', href: '#profile-target-role' },
    {
      ready: Number.isFinite(profile.yearsOfExperience),
      label: '工作年限',
      href: '#profile-years',
    },
    {
      ready: profile.techStacks.length > 0,
      label: '核心技能 / 工具',
      href: '#profile-tech-stacks',
    },
    {
      ready: Boolean(profile.resumeSummary.trim()),
      label: '个人概述 / 代表能力',
      href: '#profile-resume-summary',
    },
    {
      ready: profile.projectExperiences.length > 0,
      label: '项目 / 代表经历',
      href: '#profile-projects',
    },
    {
      ready: Boolean(profile.currentLevel.trim()),
      label: '当前能力水平',
      href: '#profile-current-level',
    },
  ];
  const completedFields = fields.filter((field) => field.ready).length;
  const primaryGap = fields.find((field) => !field.ready);
  if (!primaryGap)
    return {
      completion: PERCENTAGE_MAX,
      readinessLabel: '可进入岗位定制',
      primaryGap: null,
      nextAction: { href: '/job', label: '继续设置目标 JD' },
    };
  return {
    completion: Math.round((completedFields / PROFILE_FIELD_COUNT) * PERCENTAGE_MAX),
    readinessLabel: `${completedFields}/${PROFILE_FIELD_COUNT} 项已准备`,
    primaryGap: primaryGap.label,
    nextAction: { href: primaryGap.href, label: `补充${primaryGap.label}` },
  };
}

function trainingSignals(profile: ProfilePayload['profile']) {
  if (!profile)
    return {
      acceptedSignals: [],
      nextSteps: ['填写目标岗位，让 Agent 能够匹配训练方向'],
      trainingImpact: '完成档案后，Agent 会按目标岗位、经历和能力线索调整下一轮训练。',
    };

  const acceptedSignals = [
    `目标岗位：${profile.targetRole}`,
    profile.techStacks.length
      ? `核心技能：${profile.techStacks.slice(0, MEMORY_ITEM_LIMIT).join('、')}`
      : '',
    profile.projectExperiences.length ? `项目经历：${profile.projectExperiences.length} 项` : '',
    profile.currentLevel ? `当前水平：${profile.currentLevel}` : '',
  ].filter(Boolean);
  const nextSteps = [
    profile.resumeSummary ? null : '补充个人概述，让 Agent 理解你的代表能力',
    profile.projectExperiences.length ? null : '补充代表项目，让 Agent 能围绕细节继续追问',
  ].filter((value): value is string => value !== null);

  return {
    acceptedSignals,
    nextSteps: nextSteps.length ? nextSteps : ['档案输入已覆盖当前训练重点'],
    trainingImpact: `Agent 会优先围绕${profile.targetRole}推荐题目、设计项目追问，并在复盘中结合已记录的能力线索。`,
  };
}
