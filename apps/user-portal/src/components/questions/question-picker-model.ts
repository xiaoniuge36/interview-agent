const MAX_SELECTED_QUESTIONS = 10;

export type QuestionSelectionResult = {
  ids: string[];
  limitReached: boolean;
};

export function toggleQuestionSelection(
  selected: string[],
  questionId: string,
): QuestionSelectionResult {
  if (selected.includes(questionId)) {
    return { ids: selected.filter((id) => id !== questionId), limitReached: false };
  }
  if (selected.length >= MAX_SELECTED_QUESTIONS) {
    return { ids: selected, limitReached: true };
  }
  return { ids: [...selected, questionId], limitReached: false };
}

export function canStartQuestionSelection(selected: string[]) {
  return selected.length > 0 && selected.length <= MAX_SELECTED_QUESTIONS;
}

export function clearQuestionSelection(): string[] {
  return [];
}

/**
 * 题库大厅默认展示选题工作区：推荐只是首屏置顶的快捷入口，
 * 题库浏览（筛选、公司标签、多元题型）不应藏在按钮后面。
 * 推荐加载中暂不渲染工作区，避免首屏布局跳动；用户已有选择或主动打开时始终展示。
 */
export function shouldShowSelfPicker(input: {
  recommendationLoading: boolean;
  selectionCount: number;
  manuallyOpened: boolean;
}) {
  return input.manuallyOpened || input.selectionCount > 0 || !input.recommendationLoading;
}

export function composeQuestionSelection(
  selected: string[],
  candidates: string[],
  targetCount: number,
): string[] {
  const limit = Math.min(Math.max(targetCount, 0), MAX_SELECTED_QUESTIONS);
  return Array.from(new Set([...selected, ...candidates])).slice(0, limit);
}

export function composeQuestionSelectionWithFeedback(
  selected: string[],
  candidates: string[],
  targetCount: number,
) {
  const ids = composeQuestionSelection(selected, candidates, targetCount);
  const message = candidates.length
    ? `已按当前推荐顺序生成 ${ids.length} 题训练单。`
    : '当前没有可用于组卷的题目。';
  return { ids, message };
}
