import type { QuestionOption } from '@interview-agent/contracts';

export function selectedChoiceIds(draft: string, options: readonly QuestionOption[]) {
  const selected = new Set(
    draft
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  );
  return options.map((option) => option.id).filter((id) => selected.has(id));
}

export function toggleChoiceAnswer(input: {
  draft: string;
  optionId: string;
  options: readonly QuestionOption[];
  multiple: boolean;
}) {
  if (!input.multiple) return input.optionId;
  const selected = new Set(selectedChoiceIds(input.draft, input.options));
  if (selected.has(input.optionId)) selected.delete(input.optionId);
  else selected.add(input.optionId);
  return input.options
    .map((option) => option.id)
    .filter((id) => selected.has(id))
    .join(',');
}
