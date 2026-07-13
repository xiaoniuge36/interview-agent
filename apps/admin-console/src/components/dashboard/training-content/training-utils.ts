import type { CandidateQuestionDetail, CandidateReview } from '@interview-agent/contracts';

export function candidateUpdateInput(detail: CandidateQuestionDetail) {
  return {
    title: detail.title,
    stem: detail.stem,
    answer: detail.answer,
    tags: detail.tags,
    status: detail.status,
    reviewNotes: detail.reviewNotes,
  };
}

export function splitTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function statusLabel(status: CandidateReview['status']) {
  return {
    pending: 'Pending',
    needs_edit: 'Needs edit',
    approved: 'Approved',
    rejected: 'Rejected',
  }[status];
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The operation failed. Please try again.';
}
