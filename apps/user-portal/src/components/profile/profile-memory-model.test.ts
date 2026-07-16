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
    });
  });

  it('优先展示已分析出的优势和待练习项', () => {
    const payload = populatedProfile();
    expect(createProfileMemoryModel(payload)).toMatchObject({
      completion: 100,
      role: '高级产品经理',
      evidence: ['数据驱动', '跨团队协作'],
      focus: ['复杂场景优先级判断'],
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
