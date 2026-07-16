import type { Question } from '@interview-agent/contracts';
import { renderQuestionExportCsv } from './admin-export-csv';

describe('admin export CSV rows', () => {
  it('renders question export fields in the table order', () => {
    const result = renderQuestionExportCsv([
      {
        id: 'question-1',
        tenantId: 'tenant-1',
        visibility: 'tenant',
        title: '依赖注入',
        stem: '说明依赖注入的作用。',
        type: 'short_answer',
        difficulty: 'medium',
        tags: ['architecture'],
        answer: '通过构造函数注入依赖。',
        rubric: [],
        sourceRefs: [],
        status: 'published',
      } satisfies Question,
    ]);

    expect(result).toBe(
      '\uFEFF题目 ID,题目,题型,难度,可见范围,状态\r\nquestion-1,依赖注入,short_answer,medium,tenant,published',
    );
  });
});
