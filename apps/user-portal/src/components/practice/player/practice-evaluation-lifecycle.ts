export function isCurrentPracticeEvaluation(
  active: AbortController | null,
  candidate: AbortController,
): boolean {
  return active === candidate && !candidate.signal.aborted;
}
