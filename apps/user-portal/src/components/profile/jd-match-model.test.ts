import type { MasteryProfile } from '@interview-agent/contracts';
import { describe, expect, it } from 'vitest';
import { matchJdWithMastery } from './jd-match-model';

function profile(tag: string, score: number, evidenceCount = 3): MasteryProfile {
  return {
    id: `mastery-${tag}`,
    tenantId: 'tenant-1',
    userId: 'user-1',
    tag,
    score,
    evidenceCount,
    lastEvidenceSessionId: null,
    updatedAt: '2026-08-27T00:00:00.000Z',
  };
}

describe('matchJdWithMastery', () => {
  it('把命中 JD 的标签按分数拆成已覆盖与待补强', () => {
    const jd = '要求：熟悉 RAG 检索与系统设计，有性能优化经验。';
    const result = matchJdWithMastery(jd, [
      profile('RAG', 86),
      profile('系统设计', 45),
      profile('性能优化', 70),
      profile('Kubernetes', 90),
    ]);

    expect(result.covered.map((item) => item.tag)).toEqual(['RAG', '性能优化']);
    expect(result.gaps.map((item) => item.tag)).toEqual(['系统设计']);
  });

  it('匹配大小写不敏感且保留证据数量', () => {
    const result = matchJdWithMastery('熟悉 langgraph 编排', [profile('LangGraph', 92, 6)]);

    expect(result.covered).toEqual([{ tag: 'LangGraph', score: 92, evidenceCount: 6 }]);
  });

  it('已覆盖按分数降序、待补强按分数升序排列', () => {
    const jd = '缓存 索引 分库 容灾';
    const result = matchJdWithMastery(jd, [
      profile('缓存', 72),
      profile('索引', 95),
      profile('分库', 30),
      profile('容灾', 55),
    ]);

    expect(result.covered.map((item) => item.score)).toEqual([95, 72]);
    expect(result.gaps.map((item) => item.score)).toEqual([30, 55]);
  });

  it('空 JD 或过短标签不产生匹配', () => {
    expect(matchJdWithMastery('   ', [profile('RAG', 80)])).toEqual({ covered: [], gaps: [] });
    expect(matchJdWithMastery('go 语言', [profile('g', 80)]).covered).toEqual([]);
  });

  it('超出上限的匹配会被截断', () => {
    const tags = ['T1', 'T2', 'T3'];
    const result = matchJdWithMastery(tags.join(' '), tags.map((tag) => profile(tag, 90)), 2);

    expect(result.covered).toHaveLength(2);
  });
});
