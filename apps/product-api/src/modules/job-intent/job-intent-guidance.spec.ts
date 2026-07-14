import type { JobIntent } from '@interview-agent/contracts';
import { jobIntentGuidance } from './job-intent-guidance';

function intent(targetRole: string, jdText: string): JobIntent {
  return {
    id: 'job-intent-1',
    tenantId: 'tenant-a',
    userId: 'user-a',
    targetRole,
    jdText,
    status: 'ready',
    createdAt: '2026-07-14T08:00:00.000Z',
    updatedAt: '2026-07-14T08:00:00.000Z',
  };
}

describe('jobIntentGuidance', () => {
  it('根据 JD 关键词提升后端岗位的对应能力权重', () => {
    const guidance = jobIntentGuidance(
      intent('后端开发工程师', '负责高并发系统的性能与稳定性治理。'),
    );
    const systemDesign = guidance.skillWeights.find((item) => item.skill === '系统设计');

    expect(systemDesign?.weight).toBe(90);
  });

  it('不会把后端岗位错误分析为 AI Agent 岗位', () => {
    const guidance = jobIntentGuidance(
      intent('后端开发工程师', '负责订单服务、数据库与接口性能优化。'),
    );
    const serialized = JSON.stringify(guidance);

    expect(guidance.interviewFocus).toEqual(expect.arrayContaining(['系统设计', '工程质量']));
    expect(serialized).not.toContain('Agent');
    expect(serialized).not.toContain('RAG');
  });

  it('为产品经理提供用户与业务导向的训练重点', () => {
    const guidance = jobIntentGuidance(
      intent('产品经理', '负责用户需求洞察、优先级决策与上线指标复盘。'),
    );

    expect(guidance.interviewFocus).toEqual(
      expect.arrayContaining(['用户与业务洞察', '需求拆解', '方案取舍']),
    );
  });

  it('保留 AI Agent 岗位的专属训练能力', () => {
    const guidance = jobIntentGuidance(
      intent('AI Agent 工程师', '负责 RAG 检索、工具调用和效果评估。'),
    );

    expect(guidance.interviewFocus).toEqual(
      expect.arrayContaining(['Agent 方案设计', '知识与工具治理', '评估与可观测']),
    );
  });
  it('为商业与交付岗位提供专属训练能力', () => {
    const guidance = jobIntentGuidance(
      intent('客户成功经理', '负责客户价值方案、交付推进与续约增长。'),
    );

    expect(guidance.interviewFocus).toEqual(
      expect.arrayContaining(['客户与业务目标', '价值方案设计', '交付与经营结果']),
    );
  });
});
