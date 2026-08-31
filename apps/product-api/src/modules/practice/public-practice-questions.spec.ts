import { QuestionSchema } from '@interview-agent/contracts';
import { type RoleCategory } from '../../common/role-category';
import { practiceCategoryTagFor } from './practice-question-categories';
import { PUBLIC_PRACTICE_QUESTIONS } from './public-practice-questions';

const CATEGORIES: RoleCategory[] = [
  'engineering',
  'data',
  'ai_agent',
  'product_design',
  'growth_operations',
  'business_delivery',
  'generic',
];

const EXPANDED_MIN_QUESTIONS = 20;
const GENERALIST_CATEGORIES = CATEGORIES.filter((category) => category !== 'ai_agent');

describe('PUBLIC_PRACTICE_QUESTIONS', () => {
  it('为每个岗位类别提供至少二十道可用题目，支撑多元岗位完整训练', () => {
    expect(PUBLIC_PRACTICE_QUESTIONS).toHaveLength(192);
    GENERALIST_CATEGORIES.forEach((category) => {
      const questions = PUBLIC_PRACTICE_QUESTIONS.filter((question) =>
        question.tags.includes(practiceCategoryTagFor(category)),
      );
      expect(questions.length).toBeGreaterThanOrEqual(EXPANDED_MIN_QUESTIONS);
    });
  });

  it('包含六十九道单选题、八道多选题且题目 ID 唯一', () => {
    expect(
      PUBLIC_PRACTICE_QUESTIONS.filter((question) => question.type === 'single_choice'),
    ).toHaveLength(69);
    expect(
      PUBLIC_PRACTICE_QUESTIONS.filter((question) => question.type === 'multiple_choice'),
    ).toHaveLength(8);
    expect(new Set(PUBLIC_PRACTICE_QUESTIONS.map((question) => question.id)).size).toBe(
      PUBLIC_PRACTICE_QUESTIONS.length,
    );
  });

  it('全部满足共享题目契约', () => {
    PUBLIC_PRACTICE_QUESTIONS.forEach((question) => {
      expect(QuestionSchema.parse(question)).toEqual(question);
    });
  });

  it('包含 Agent Loop 分层关系与最小实现题', () => {
    const questionsById = new Map(
      PUBLIC_PRACTICE_QUESTIONS.map((question) => [question.id, question]),
    );

    expect(questionsById.get('q-agent-bank-open-loop-react-function-layering')).toEqual(
      expect.objectContaining({
        title: 'Agent Loop、ReAct 与 Function Calling 的关系是什么？',
        type: 'short_answer',
        tags: expect.arrayContaining(['Agent Loop', 'ReAct', 'Function Calling']),
      }),
    );
    expect(questionsById.get('q-agent-bank-open-minimal-agent-loop')).toEqual(
      expect.objectContaining({
        title: '如何用 Go 实现一个最小可用的 Agent Loop？',
        type: 'coding',
        tags: expect.arrayContaining(['Agent Loop', 'Go', 'Tool Calling']),
      }),
    );
  });
});

describe('PUBLIC_PRACTICE_QUESTIONS 多元题型', () => {
  it('非 AI 类别混合行为面、概念题与不同难度，而不是单一题型', () => {
    GENERALIST_CATEGORIES.forEach((category) => {
      const questions = PUBLIC_PRACTICE_QUESTIONS.filter((question) =>
        question.tags.includes(practiceCategoryTagFor(category)),
      );
      expect(new Set(questions.map((question) => question.type)).size).toBeGreaterThanOrEqual(4);
      expect(new Set(questions.map((question) => question.difficulty)).size).toBeGreaterThanOrEqual(
        2,
      );
    });
  });

  it('每个非 AI 类别都提供可快速自测的选择题，且选项与答案完整', () => {
    GENERALIST_CATEGORIES.forEach((category) => {
      const choices = PUBLIC_PRACTICE_QUESTIONS.filter(
        (question) =>
          question.tags.includes(practiceCategoryTagFor(category)) &&
          question.type === 'single_choice',
      );
      expect(choices.length).toBeGreaterThanOrEqual(5);
      choices.forEach((question) => {
        const optionIds = new Set((question.options ?? []).map((option) => option.id));
        expect(optionIds.size).toBeGreaterThanOrEqual(2);
        question.correctOptionIds?.forEach((id) => expect(optionIds.has(id)).toBe(true));
      });
    });
  });

  it('工程方向覆盖系统设计与手撕代码实战题', () => {
    const engineering = PUBLIC_PRACTICE_QUESTIONS.filter((question) =>
      question.tags.includes(practiceCategoryTagFor('engineering')),
    );
    expect(engineering.some((question) => question.type === 'system_design')).toBe(true);
    expect(engineering.some((question) => question.type === 'coding')).toBe(true);
  });
});

describe('PUBLIC_PRACTICE_QUESTIONS 学习课程联动', () => {
  it('学习课程验证入口依赖的主题标签都有对应单选题', () => {
    // 与 user-portal learning-verification.ts 的 LEARNING_COURSES topic.tag 保持同步：
    // 课程页「进入题库验证」按 tag + single_choice 过滤，标签悬空会让验证入口查到空结果。
    const COURSE_TOPIC_TAGS = [
      'ReAct',
      'Tool Calling',
      'RAG',
      '记忆与编排',
      'Agent 评估',
      '生产可靠性',
      '面试表达',
      'Computer Use',
      'Agent Harness',
      '协议与互操作',
      'Agent RL',
      'STAR',
      '简历优化',
      '结构化表达',
      'Offer 决策',
      '数据库',
      '统计思维',
      '产品方法论',
      '增长模型',
    ];
    const missingTags = COURSE_TOPIC_TAGS.filter(
      (tag) =>
        !PUBLIC_PRACTICE_QUESTIONS.some(
          (question) => question.type === 'single_choice' && question.tags.includes(tag),
        ),
    );
    expect(missingTags).toEqual([]);
  });
});
