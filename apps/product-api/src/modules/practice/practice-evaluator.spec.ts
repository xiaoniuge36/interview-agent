import type { RubricPoint } from '@interview-agent/contracts';
import { PracticeEvaluator } from './practice-evaluator';

const rubric: RubricPoint[] = [
  { point: '检索与生成', score: 40, description: '说明检索如何为生成提供可靠上下文。' },
  { point: '方案取舍', score: 60, description: '说明时延、成本与事实可靠性的取舍。' },
];

describe('PracticeEvaluator', () => {
  it('返回带有评分与复盘建议的确定性评估结果', () => {
    const evaluation = new PracticeEvaluator().evaluate({
      answer: '检索可以为生成提供可靠上下文，并通过缓存和召回策略平衡时延与成本。',
      referenceAnswer: '检索与生成结合后，需要平衡可靠上下文、时延、成本和事实准确性。',
      rubric,
      tags: ['RAG', 'role:ai_agent'],
    });

    expect(evaluation.score).toBeGreaterThan(20);
    expect(evaluation.rubricScores).toHaveLength(2);
    expect(evaluation.feedback).toContain('本次回答');
  });

  it('为缺少核心依据的简短回答标记待强化能力', () => {
    const evaluation = new PracticeEvaluator().evaluate({
      answer: '这个方案可以使用。',
      referenceAnswer: '检索与生成结合后，需要平衡可靠上下文、时延、成本和事实准确性。',
      rubric,
      tags: ['RAG'],
    });

    expect(evaluation.missingPoints.length).toBeGreaterThan(0);
    expect(evaluation.score).toBeLessThan(50);
  });

  it('识别中文岗位能力点，不把内部岗位标签暴露为能力记录', () => {
    const evaluation = new PracticeEvaluator().evaluate({
      answer: '我会先明确系统边界，再根据关键约束划分模块职责，并通过监控验证上线结果。',
      referenceAnswer: '先明确系统边界、关键约束与模块职责，再通过监控验证结果。',
      rubric: [
        { point: '系统边界', score: 40, description: '说明模块职责与边界。' },
        { point: '结果验证', score: 60, description: '说明监控指标与验证方式。' },
      ],
      tags: ['role:engineering', '系统设计'],
    });

    expect(evaluation.score).toBeGreaterThan(50);
    expect(evaluation.missingPoints).not.toContain('系统边界');
    expect(evaluation.feedback).toContain('本次回答');
  });
});
