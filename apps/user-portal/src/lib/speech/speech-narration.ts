import type { InterviewTurn } from '@interview-agent/contracts';

const NARRATION_LANG = 'zh-CN';

/**
 * 持有播放中的 utterance 引用：Chrome 对失去 JS 引用的 utterance 会 GC，
 * 长文本朗读中途无声且不触发 onend。引用保留到 onend/onerror 再释放。
 */
let activeUtterance: SpeechSynthesisUtterance | null = null;

/** 朗读开始通知：听写模块订阅后在朗读时暂停采集，避免扬声器回声被写进草稿。 */
const narrationStartListeners = new Set<() => void>();

export function onNarrationStart(listener: () => void): () => void {
  narrationStartListeners.add(listener);
  return () => {
    narrationStartListeners.delete(listener);
  };
}

export function narrationSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** 朗读一段文本；开始前打断上一段，避免队列越积越长。 */
export function speakText(text: string): void {
  if (!narrationSupported()) return;
  const content = text.trim();
  if (!content) return;
  narrationStartListeners.forEach((listener) => listener());
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(content);
  utterance.lang = NARRATION_LANG;
  utterance.onend = () => {
    if (activeUtterance === utterance) activeUtterance = null;
  };
  utterance.onerror = () => {
    if (activeUtterance === utterance) activeUtterance = null;
  };
  activeUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopNarration(): void {
  if (!narrationSupported()) return;
  activeUtterance = null;
  window.speechSynthesis.cancel();
}

/** 只朗读这个时间窗内新到达的消息；恢复历史会话时旧消息一律不补读。 */
const NARRATION_FRESHNESS_MS = 45_000;

/**
 * 决定本次 turns 变化后要自动朗读哪条消息：
 * - 只朗读最新一条未读的面试官消息，候选人消息结尾时没有新问题；
 * - 已读过的不重复朗读；
 * - 消息创建时间超出新鲜窗（恢复历史会话、加载旧数据）不自动补读，重听按钮仍可手动朗读。
 */
export function nextNarrationTurn(
  turns: readonly InterviewTurn[],
  spokenIds: ReadonlySet<string>,
  now: number = Date.now(),
): InterviewTurn | null {
  const latest = turns[turns.length - 1];
  if (!latest || latest.role !== 'interviewer') return null;
  if (spokenIds.has(latest.id)) return null;
  const age = now - new Date(latest.createdAt).getTime();
  if (Number.isNaN(age) || age > NARRATION_FRESHNESS_MS) return null;
  return latest;
}

export function interviewerTurnIds(turns: readonly InterviewTurn[]): string[] {
  return turns.filter((turn) => turn.role === 'interviewer').map((turn) => turn.id);
}
