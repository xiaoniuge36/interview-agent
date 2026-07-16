import type { CandidateQuestionDetail } from '@interview-agent/contracts';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CandidateForm } from './CandidateForm';

const detail = {
  id: 'candidate-1',
  tenantId: 'tenant-1',
  importTaskId: 'import-1',
  publishedQuestionId: null,
  title: '解释依赖注入的边界',
  stem: '说明依赖注入为什么可以降低模块耦合。',
  type: 'short_answer',
  difficulty: 'medium',
  answer: '依赖由调用方提供，模块只依赖接口。',
  rubric: [{ point: '说明依赖反转', score: 10, description: '解释调用方组装依赖。' }],
  status: 'pending',
  qualityScore: 88,
  tags: ['架构'],
  sourceRefs: ['import://java-guide'],
  reviewNotes: null,
  createdAt: '2026-07-16T00:00:00.000Z',
  updatedAt: '2026-07-16T00:00:00.000Z',
} satisfies CandidateQuestionDetail;

describe('CandidateForm', () => {
  it('uses explicit review actions instead of a status dropdown', () => {
    const markup = renderToStaticMarkup(
      createElement(CandidateForm, {
        detail,
        onChange: () => undefined,
        onPublish: () => undefined,
        onSave: () => undefined,
        saving: false,
      }),
    );

    const compactMarkup = markup.replace(/\s+/g, '');
    expect(compactMarkup).toContain('通过');
    expect(compactMarkup).toContain('需修改');
    expect(compactMarkup).toContain('驳回');
    expect(markup).not.toContain('ant-select');
  });
});
