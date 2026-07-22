import {
  BatchCandidatePublishInputSchema,
  BatchCandidatePublishResultSchema,
  BatchCandidateReviewInputSchema,
  BatchCandidateReviewResultSchema,
  CandidateQuestionDetailSchema,
  ImportReviewContextSchema,
  ImportTaskSchema,
  MarkdownImportRequestSchema,
  PublishCandidateQuestionInputSchema,
  QuestionSchema,
  UpdateCandidateQuestionInputSchema,
  type BatchCandidatePublishInput,
  type BatchCandidatePublishResult,
  type BatchCandidateReviewInput,
  type BatchCandidateReviewResult,
  type CandidateQuestionDetail,
  type ImportReviewContext,
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

export function createBatchCandidateReviewRequest(input: BatchCandidateReviewInput) {
  return {
    path: '/admin/candidates/batch-review',
    schema: BatchCandidateReviewResultSchema,
    init: {
      method: 'PATCH',
      body: JSON.stringify(BatchCandidateReviewInputSchema.parse(input)),
    },
  };
}

export function batchReviewCandidates(
  input: BatchCandidateReviewInput,
): Promise<BatchCandidateReviewResult> {
  return adminRequest(createBatchCandidateReviewRequest(input));
}

export function createBatchCandidatePublishRequest(input: BatchCandidatePublishInput) {
  return {
    path: '/admin/candidates/batch-publish',
    schema: BatchCandidatePublishResultSchema,
    init: {
      method: 'POST',
      body: JSON.stringify(BatchCandidatePublishInputSchema.parse(input)),
    },
  };
}

export function batchPublishCandidates(
  input: BatchCandidatePublishInput,
): Promise<BatchCandidatePublishResult> {
  return adminRequest(createBatchCandidatePublishRequest(input));
}

export function createImportReviewContextRequest(taskId: string) {
  return {
    path: `/admin/imports/${encodeURIComponent(taskId)}/review-context`,
    schema: ImportReviewContextSchema,
  };
}

export function getImportReviewContext(taskId: string): Promise<ImportReviewContext> {
  return adminRequest(createImportReviewContextRequest(taskId));
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
