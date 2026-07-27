import { describe, expect, it } from 'vitest';
import type { ProfilePayload } from '@interview-agent/contracts';
import { createProfileMemoryModel } from './profile-memory-model';

const EMPTY_PROFILE: ProfilePayload = { profile: null, snapshot: null };

describe('个人档案的 Agent 记忆摘要', () => {
  it('空档案给出明确的补充引导', () => {
    expect(createProfileMemoryModel(EMPTY_PROFILE)).toMatchObject({
      completion: 0,
      role: '等待完善目标岗位',
      evidence: ['保存档案后，Agent 会在这里归纳你的优势证据。'],
      acceptedSignals: [],
      nextSteps: ['填写目标岗位，让 Agent 能够匹配训练方向'],
      trainingImpact: '完成档案后，Agent 会按目标岗位、经历和能力线索调整下一轮训练。',
    });
  });

  it('资料不完整时标记下一步需要补齐的训练信号', () => {
    expect(createProfileMemoryModel(partialProfile()).nextSteps).toEqual([
      '补充个人概述，让 Agent 理解你的代表能力',
      '补充代表项目，让 Agent 能围绕细节继续追问',
    ]);
  });

  it('优先展示已分析出的优势和待练习项', () => {
    const payload = populatedProfile();
    expect(createProfileMemoryModel(payload)).toMatchObject({
      completion: 100,
      role: '高级产品经理',
      evidence: ['数据驱动', '跨团队协作'],
      focus: ['复杂场景优先级判断'],
      acceptedSignals: [
        '目标岗位：高级产品经理',
        '核心技能：数据分析',
        '项目经历：1 项',
        '当前水平：高级',
      ],
      nextSteps: ['档案输入已覆盖当前训练重点'],
    });
  });

  it('分析结果暂时为空时回退展示已填写的技能证据', () => {
    const payload = populatedProfile();
    const withoutStrengths = {
      ...payload,
      snapshot: payload.snapshot ? { ...payload.snapshot, strengths: [] } : null,
    };

    expect(createProfileMemoryModel(withoutStrengths).evidence).toEqual(['数据分析']);
  });
});

function partialProfile(): ProfilePayload {
  const payload = populatedProfile();
  const profile = payload.profile;
  if (!profile) throw new Error('完整档案夹具不能为空');
  return {
    ...payload,
    profile: {
      ...profile,
      techStacks: [],
      resumeSummary: '',
      projectExperiences: [],
    },
  };
}

function populatedProfile(): ProfilePayload {
  return {
    profile: {
      id: 'profile-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      targetRole: '高级产品经理',
      yearsOfExperience: 5,
      techStacks: ['数据分析'],
      resumeSummary: '拥有完整的产品增长项目经验。',
      projectExperiences: ['负责增长项目并取得可量化结果。'],
      currentLevel: '高级',
      updatedAt: '2026-07-15T00:00:00.000Z',
    },
    snapshot: {
      id: 'snapshot-1',
      tenantId: 'tenant-1',
      profileId: 'profile-1',
      strengths: ['数据驱动', '跨团队协作'],
      weaknesses: ['复杂场景优先级判断'],
      riskSignals: [],
      skillMap: [],
      createdAt: '2026-07-15T00:00:00.000Z',
    },
  };
}
