import { describe, expect, it } from 'vitest';
import {
  learningCourseHref,
  recommendCoursesForWeakness,
  type WeaknessSignal,
} from './learning-course-recommendation';

function weakSignal(tags: string[], score = 40): WeaknessSignal {
  return { tags, score };
}

describe('recommendCoursesForWeakness', () => {
  it('把低分题标签换算成课程入口，并统计命中题数与最低分', () => {
    const recommendations = recommendCoursesForWeakness([
      weakSignal(['ReAct', '基础概念'], 35),
      weakSignal(['ReAct'], 52),
      weakSignal(['记忆与编排'], 48),
    ]);

    expect(recommendations).toEqual([
      {
        courseSlug: '学习路线-01-agent基础与上下文工程',
        courseTitle: 'Agent 基础与上下文工程',
        topicLabel: 'ReAct',
        href: '/learn?doc=%E5%AD%A6%E4%B9%A0%E8%B7%AF%E7%BA%BF-01-agent%E5%9F%BA%E7%A1%80%E4%B8%8E%E4%B8%8A%E4%B8%8B%E6%96%87%E5%B7%A5%E7%A8%8B',
        weakCount: 2,
        lowestScore: 35,
      },
      {
        courseSlug: '学习路线-04-memory-planning与multi-agent',
        courseTitle: 'Memory、Planning 与 Multi-Agent',
        topicLabel: 'Memory 与编排',
        href: learningCourseHref('学习路线-04-memory-planning与multi-agent'),
        weakCount: 1,
        lowestScore: 48,
      },
    ]);
  });

});

describe('recommendCoursesForWeakness 过滤与排序', () => {
  it('达到及格线（60 分）的题不参与推荐，未映射课程的标签被忽略', () => {
    expect(
      recommendCoursesForWeakness([
        weakSignal(['ReAct'], 60),
        weakSignal(['ReAct'], 88),
        weakSignal(['系统设计', '高并发'], 20),
      ]),
    ).toEqual([]);
  });

  it('命中数相同的课程按最低分升序（更薄弱的优先），并按 limit 截断', () => {
    const recommendations = recommendCoursesForWeakness(
      [
        weakSignal(['Tool Calling'], 55),
        weakSignal(['RAG'], 30),
        weakSignal(['Agent 评估'], 45),
      ],
      { limit: 2 },
    );

    expect(recommendations.map((item) => item.topicLabel)).toEqual(['RAG', 'Agent 评估']);
  });

  it('同一道题多个标签指向同一课程时只计一次弱项', () => {
    const recommendations = recommendCoursesForWeakness([
      weakSignal(['ReAct', 'ReAct'], 30),
    ]);

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0]!.weakCount).toBe(1);
  });
});
