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
    pending: '待审核',
    needs_edit: '需修改',
    approved: '已通过',
    rejected: '已拒绝',
  }[status];
}

export function canPublishCandidate(status: CandidateReview['status']): boolean {
  return status === 'approved';
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '操作失败，请稍后重试。';
}
