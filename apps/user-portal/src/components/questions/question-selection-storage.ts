import { CONTRACT_LIMITS, type QuestionCatalogResponse } from '@interview-agent/contracts';
import { z } from 'zod';

const MAX_SELECTED_QUESTIONS = 10;
const STORAGE_KEY = 'interview-agent:question-selection:v1';
const STORAGE_VERSION = 1;
const SelectedQuestionSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  })
  .strict();
const SelectionSchema = z
  .object({
    version: z.literal(STORAGE_VERSION),
    items: z.array(SelectedQuestionSchema).max(MAX_SELECTED_QUESTIONS),
  })
  .superRefine((value, context) => {
    const ids = value.items.map((item) => item.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'DUPLICATE_QUESTION_IDS' });
    }
  });

type CatalogQuestion = QuestionCatalogResponse['items'][number];
export type SelectedQuestion = Pick<CatalogQuestion, 'id' | 'title'>;

export type QuestionSelectionStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>;

export function readQuestionSelection(storage: QuestionSelectionStorage): SelectedQuestion[] {
  try {
    const stored = storage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = SelectionSchema.safeParse(JSON.parse(stored));
    if (parsed.success) return parsed.data.items;
    storage.removeItem(STORAGE_KEY);
  } catch {
    safelyClear(storage);
  }
  return [];
}

export function writeQuestionSelection(
  storage: QuestionSelectionStorage,
  selected: SelectedQuestion[],
) {
  try {
    const parsed = SelectionSchema.safeParse({
      version: STORAGE_VERSION,
      items: selected.map(({ id, title }) => ({ id, title })),
    });
    if (!parsed.success) return;
    if (!parsed.data.items.length) storage.removeItem(STORAGE_KEY);
    else storage.setItem(STORAGE_KEY, JSON.stringify(parsed.data));
  } catch {
    // Storage 不可用时仍保留当前页面内的选择状态。
  }
}

function safelyClear(storage: QuestionSelectionStorage) {
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // 损坏数据无法清理时也不能阻断题库页面。
  }
}
