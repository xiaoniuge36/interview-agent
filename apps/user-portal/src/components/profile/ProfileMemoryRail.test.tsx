import type { ProfilePayload } from '@interview-agent/contracts';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ProfileMemoryRail } from './ProfileMemoryRail';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const EMPTY_PROFILE: ProfilePayload = { profile: null, snapshot: null };

const COMPLETE_PROFILE: ProfilePayload = {
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
    strengths: ['数据驱动'],
    weaknesses: ['复杂场景优先级判断'],
    riskSignals: [],
    skillMap: [],
    createdAt: '2026-07-15T00:00:00.000Z',
  },
};

describe('ProfileMemoryRail', () => {
  it('为空档案给出可执行的训练画像下一步', () => {
    const markup = renderRail(EMPTY_PROFILE);

    expect(markup).toContain('Agent 记忆透镜');
    expect(markup).toContain('Agent 已采纳的训练信号');
    expect(markup).toContain('保存档案后，信号会显示在这里。');
    expect(markup).toContain('下一步补齐');
    expect(markup).toContain('下一轮训练会如何变化？');
    expect(markup).toContain('训练准备度');
    expect(markup).toContain('待开始');
    expect(markup).toContain('最缺一项：目标岗位');
    expect(markup).toContain('href="#profile-target-role"');
    expect(markup).not.toContain('0%');
    expect(markup).not.toContain('href="/job"');
    expect(markup).not.toContain('role="progressbar"');
  });

  it('为完整档案展示已采纳信号与训练影响', () => {
    const markup = renderRail(COMPLETE_PROFILE);

    expect(markup).toContain('目标岗位：高级产品经理');
    expect(markup).toContain('核心技能：数据分析');
    expect(markup).toContain('档案输入已覆盖当前训练重点');
    expect(markup).toContain('Agent 会优先围绕高级产品经理推荐题目');
    expect(markup).toContain('可进入岗位定制');
    expect(markup).toContain('href="/job"');
    expect(markup).toContain('继续设置目标 JD');
    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain('aria-valuemin="0"');
    expect(markup).toContain('aria-valuemax="100"');
    expect(markup).toContain('aria-valuenow="100"');
    expect(markup).toContain('aria-valuetext="可进入岗位定制"');
  });
});

function renderRail(profile: ProfilePayload) {
  return renderToStaticMarkup(createElement(ProfileMemoryRail, { profile }));
}
