import {
  buildPublicChoiceQuestions,
  buildPublicPracticeQuestions,
  type PublicChoiceQuestionInput,
  type PublicPracticeQuestionInput,
} from './public-practice-question-builders';

function subjectiveInput(
  overrides: Partial<PublicPracticeQuestionInput> = {},
): PublicPracticeQuestionInput {
  return {
    suffix: 'engineering-demo',
    title: '示例题',
    stem: '请说明你的方案。',
    answer: '参考答案。',
    tags: ['系统设计'],
    points: ['方案取舍', '结果验证'],
    ...overrides,
  };
}

function choiceInput(overrides: Partial<PublicChoiceQuestionInput> = {}): PublicChoiceQuestionInput {
  return {
    suffix: 'engineering-choice-demo',
    title: '示例单选',
    stem: '以下哪项正确？',
    answer: '选 A，因为……',
    tags: ['基础概念'],
    options: ['正确项', '干扰项一', '干扰项二', '干扰项三'],
    correctOptionIds: ['A'],
    ...overrides,
  };
}

describe('buildPublicPracticeQuestions', () => {
  it('按输入生成带 role 标签与逐点 rubric 的题目', () => {
    const [question] = buildPublicPracticeQuestions('engineering', [subjectiveInput()]);
    expect(question!.id).toBe('q-practice-engineering-demo');
    expect(question!.tags).toEqual(['role:engineering', '系统设计']);
    expect(question!.rubric.map((item) => item.point)).toEqual(['方案取舍', '结果验证']);
  });

  it('空 points 在构建期抛错，而不是等到评估时 500', () => {
    expect(() =>
      buildPublicPracticeQuestions('engineering', [subjectiveInput({ points: [] })]),
    ).toThrow(/engineering-demo.*评分要点/);
  });
});

describe('buildPublicChoiceQuestions', () => {
  it('为选项分配字母 id 并保留正确答案', () => {
    const [question] = buildPublicChoiceQuestions('engineering', [choiceInput()]);
    expect(question!.options?.map((option) => option.id)).toEqual(['A', 'B', 'C', 'D']);
    expect(question!.correctOptionIds).toEqual(['A']);
  });

  it('选项数超过字母池上限时抛出明确错误', () => {
    const options = Array.from({ length: 9 }, (_, index) => `选项 ${index + 1}`);
    expect(() => buildPublicChoiceQuestions('engineering', [choiceInput({ options })])).toThrow(
      /engineering-choice-demo.*9 个选项/,
    );
  });
});
