import type { CandidateQuestionDetail } from '@interview-agent/contracts';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CandidateForm, PUBLISH_CONFIRMATION } from './CandidateForm';

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
  it('requires confirmation before an approved candidate is published', () => {
    expect(PUBLISH_CONFIRMATION).toEqual({
      title: '确认发布到题库？',
      description: '将先保存当前审核结论。发布后，该候选题不能再编辑。',
    });
  });

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
    expect(compactMarkup).toContain('保存并发布到题库');
    expect(markup).not.toContain('ant-select');
  });

  it('makes a published candidate read-only instead of submitting another review update', () => {
    const markup = renderToStaticMarkup(
      createElement(CandidateForm, {
        detail: { ...detail, publishedQuestionId: 'question-1', status: 'approved' },
        onChange: () => undefined,
        onPublish: () => undefined,
        onSave: () => undefined,
        saving: false,
      }),
    );

    expect(markup).toContain('已发布到题库');
    expect(markup).toMatch(/<button[^>]*disabled[^>]*><span>保存审核/);
  });
});
