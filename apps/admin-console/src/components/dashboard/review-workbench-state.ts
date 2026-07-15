import type { CandidateReview } from '@interview-agent/contracts';

export function resolveReviewCandidateId(
  candidates: CandidateReview[],
  selectedCandidateId: string | null,
): string | null {
  if (!selectedCandidateId) return null;
  return candidates.some((candidate) => candidate.id === selectedCandidateId)
    ? selectedCandidateId
    : null;
}
