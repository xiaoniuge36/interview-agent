import type {
  CandidateQuestionDetail,
  Question,
  UpdateCandidateQuestionInput,
} from '@interview-agent/contracts';
import { describe, expect, it } from 'vitest';
import { saveAndPublishCandidate } from './candidate-publish-flow';

const candidate = {
  id: 'candidate-1',
  tenantId: 'tenant-1',
  importTaskId: 'import-1',
  publishedQuestionId: null,
  title: '解释依赖注入',
  stem: '说明依赖注入如何降低模块耦合。',
  type: 'short_answer',
  difficulty: 'medium',
  answer: '由调用方提供依赖。',
  rubric: [{ point: '说明依赖反转', score: 10, description: '解释调用方组装依赖。' }],
  status: 'approved',
  qualityScore: 88,
  tags: ['架构'],
  sourceRefs: ['knowledge://asset/import-1/chunk/1'],
  reviewNotes: '原文依据充分。',
  createdAt: '2026-07-17T00:00:00.000Z',
  updatedAt: '2026-07-17T00:00:00.000Z',
} satisfies CandidateQuestionDetail;

describe('saveAndPublishCandidate', () => {
  it('persists the approved review before it calls the publish endpoint', async () => {
    const calls: string[] = [];
    const update = async (...args: [string, UpdateCandidateQuestionInput]) => {
      const [, input] = args;
      calls.push(`update:${input.status}`);
      return candidate;
    };
    const publish = async (candidateId: string) => {
      calls.push(`publish:${candidateId}`);
      return { id: 'question-1', title: candidate.title } as Question;
    };

    const result = await saveAndPublishCandidate(candidate, update, publish);

    expect(calls).toEqual(['update:approved', 'publish:candidate-1']);
    expect(result.question.id).toBe('question-1');
  });

  it('keeps an already published candidate on the idempotent publish path', async () => {
    const calls: string[] = [];
    const update = async (...args: [string, UpdateCandidateQuestionInput]) => {
      calls.push(`update:${args[0]}`);
      return candidate;
    };
    const publish = async (candidateId: string) => {
      calls.push(`publish:${candidateId}`);
      return { id: 'question-1', title: candidate.title } as Question;
    };

    await saveAndPublishCandidate(
      { ...candidate, publishedQuestionId: 'question-1' },
      update,
      publish,
    );

    expect(calls).toEqual(['publish:candidate-1']);
  });

  it('does not save or publish a candidate that is not marked approved in the editor', async () => {
    const calls: string[] = [];
    const update = async (...args: [string, UpdateCandidateQuestionInput]) => {
      calls.push(`update:${args[0]}`);
      return candidate;
    };
    const publish = async (candidateId: string) => {
      calls.push(`publish:${candidateId}`);
      return { id: 'question-1', title: candidate.title } as Question;
    };

    await expect(
      saveAndPublishCandidate({ ...candidate, status: 'pending' }, update, publish),
    ).rejects.toThrow('候选题需要先选择“通过”才能发布。');

    expect(calls).toEqual([]);
  });
});
