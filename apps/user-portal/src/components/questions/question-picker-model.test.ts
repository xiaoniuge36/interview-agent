import { describe, expect, it } from 'vitest';
import {
  canStartQuestionSelection,
  clearQuestionSelection,
  toggleQuestionSelection,
} from './question-picker-model';

describe('自选题单状态', () => {
  it('切换题目时保持去重并支持取消选择', () => {
    expect(toggleQuestionSelection([], 'q-1')).toEqual({ ids: ['q-1'], limitReached: false });
    expect(toggleQuestionSelection(['q-1'], 'q-1')).toEqual({ ids: [], limitReached: false });
  });

  it('最多允许选择十道题', () => {
    const selected = Array.from({ length: 10 }, (_, index) => `q-${index}`);

    expect(toggleQuestionSelection(selected, 'q-10')).toEqual({
      ids: selected,
      limitReached: true,
    });
  });

  it('至少选择一道题才允许开始并可一键清空', () => {
    expect(canStartQuestionSelection([])).toBe(false);
    expect(canStartQuestionSelection(['q-1'])).toBe(true);
    expect(clearQuestionSelection()).toEqual([]);
  });
});
