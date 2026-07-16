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
