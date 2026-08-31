export function isCurrentPracticeEvaluation(
  active: AbortController | null,
  candidate: AbortController,
): boolean {
  return active === candidate && !candidate.signal.aborted;
}

/**
 * 用户主动取消流式评价后的状态补丁：abort 掉的请求会被结算守卫忽略，
 * 因此 busy/aiOperation 必须由取消动作本身立即复位，否则界面会一直锁在评价中。
 */
export function practiceEvaluationCancelPatch() {
  return {
    busy: null,
    issue: null,
    aiOperation: null,
    message: '已取消本次 AI 评价，回答仍已保存，可随时重新生成。',
  } as const;
}
