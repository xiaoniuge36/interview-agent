import {
  CandidateQuestionDetailSchema,
  ImportTaskSchema,
  MarkdownImportRequestSchema,
  PublishCandidateQuestionInputSchema,
  QuestionSchema,
  UpdateCandidateQuestionInputSchema,
  type CandidateQuestionDetail,
  type ImportTask,
  type MarkdownImportRequest,
  type PublishCandidateQuestionInput,
  type Question,
  type UpdateCandidateQuestionInput,
} from '@interview-agent/contracts';
import { adminRequest } from './api';

export function importMarkdown(input: MarkdownImportRequest): Promise<ImportTask> {
  return adminRequest({
    path: '/admin/imports',
    schema: ImportTaskSchema,
    init: { method: 'POST', body: JSON.stringify(MarkdownImportRequestSchema.parse(input)) },
  });
}

export function getCandidateDetail(candidateId: string): Promise<CandidateQuestionDetail> {
  return adminRequest({
    path: `/admin/candidates/${candidateId}`,
    schema: CandidateQuestionDetailSchema,
  });
}

export function updateCandidate(
  candidateId: string,
  input: UpdateCandidateQuestionInput,
): Promise<CandidateQuestionDetail> {
  return adminRequest({
    path: `/admin/candidates/${candidateId}`,
    schema: CandidateQuestionDetailSchema,
    init: {
      method: 'PATCH',
      body: JSON.stringify(UpdateCandidateQuestionInputSchema.parse(input)),
    },
  });
}

export function publishCandidate(
  candidateId: string,
  input?: PublishCandidateQuestionInput,
): Promise<Question> {
  return adminRequest({
    path: `/admin/candidates/${candidateId}/publish`,
    schema: QuestionSchema,
    init: {
      method: 'POST',
      body: JSON.stringify(PublishCandidateQuestionInputSchema.parse(input ?? {})),
    },
  });
}
