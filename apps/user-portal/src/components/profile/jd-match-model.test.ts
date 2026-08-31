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
    expect(matchJdWithMastery('   ', [profile('RAG', 80)])).toEqual({
      covered: [],
      gaps: [],
      coveredOmitted: 0,
      gapsOmitted: 0,
    });
    expect(matchJdWithMastery('go 语言', [profile('g', 80)]).covered).toEqual([]);
  });

  it('超出上限的匹配会被截断，并报告每侧被省略的条数', () => {
    const tags = ['T1', 'T2', 'T3'];
    const result = matchJdWithMastery(
      [...tags, '薄弱项'].join(' '),
      [...tags.map((tag) => profile(tag, 90)), profile('薄弱项', 30)],
      2,
    );

    expect(result.covered).toHaveLength(2);
    expect(result.coveredOmitted).toBe(1);
    expect(result.gaps).toHaveLength(1);
    expect(result.gapsOmitted).toBe(0);
  });
});

describe('matchJdWithMastery 词边界', () => {
  it('ASCII 标签按词边界匹配，不再被更长的词误命中', () => {
    const jd = '要求：精通 JavaScript 与 Google Cloud，了解 Django。';
    const result = matchJdWithMastery(jd, [profile('Java', 90), profile('Go', 85)]);

    expect(result.covered).toEqual([]);
    expect(result.gaps).toEqual([]);
  });

  it('词边界匹配仍命中真实出现的 ASCII 标签', () => {
    const jd = '技术栈：Java、Go语言，构建 C++ 服务与 Node.js 网关。';
    const result = matchJdWithMastery(jd, [
      profile('Java', 90),
      profile('Go', 85),
      profile('C++', 80),
      profile('Node.js', 75),
    ]);

    expect(result.covered.map((item) => item.tag)).toEqual(['Java', 'Go', 'C++', 'Node.js']);
  });

  it('中文标签保持子串匹配', () => {
    const result = matchJdWithMastery('负责高并发系统设计与调优', [profile('系统设计', 88)]);

    expect(result.covered.map((item) => item.tag)).toEqual(['系统设计']);
  });
});
