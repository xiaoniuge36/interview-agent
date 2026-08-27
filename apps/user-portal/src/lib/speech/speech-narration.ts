import type { InterviewTurn } from '@interview-agent/contracts';

const NARRATION_LANG = 'zh-CN';

export function narrationSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** 朗读一段文本；开始前打断上一段，避免队列越积越长。 */
export function speakText(text: string): void {
  if (!narrationSupported()) return;
  const content = text.trim();
  if (!content) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(content);
  utterance.lang = NARRATION_LANG;
  window.speechSynthesis.speak(utterance);
}

export function stopNarration(): void {
  if (narrationSupported()) window.speechSynthesis.cancel();
}

/**
 * 决定本次 turns 变化后要自动朗读哪条消息：
 * - 恢复历史会话（首次填充即多条）不补读旧消息；
 * - 只朗读最新一条未读的面试官消息，候选人消息结尾时没有新问题；
 * - 已读过的不重复朗读。
 */
export function nextNarrationTurn(
  turns: readonly InterviewTurn[],
  previousCount: number,
  spokenIds: ReadonlySet<string>,
): InterviewTurn | null {
  if (previousCount === 0 && turns.length > 1) return null;
  const latest = turns[turns.length - 1];
  if (!latest || latest.role !== 'interviewer') return null;
  return spokenIds.has(latest.id) ? null : latest;
}

export function interviewerTurnIds(turns: readonly InterviewTurn[]): string[] {
  return turns.filter((turn) => turn.role === 'interviewer').map((turn) => turn.id);
}
