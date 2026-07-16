import { describe, expect, it } from 'vitest';
import {
  canStartQuestionSelection,
  clearQuestionSelection,
  composeQuestionSelection,
  composeQuestionSelectionWithFeedback,
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

  it('快速组卷按候选顺序去重并遵守目标数量', () => {
    expect(composeQuestionSelection(['q-1'], ['q-1', 'q-2', 'q-2', 'q-3'], 3)).toEqual([
      'q-1',
      'q-2',
      'q-3',
    ]);
  });

  it('快速组卷不会超过题单上限', () => {
    const candidates = Array.from({ length: 12 }, (_, index) => `q-${index}`);
    expect(composeQuestionSelection([], candidates, 12)).toEqual(candidates.slice(0, 10));
  });

  it('快速组卷反馈使用实际生成的题目数', () => {
    expect(composeQuestionSelectionWithFeedback([], ['q-1', 'q-2'], 5)).toEqual({
      ids: ['q-1', 'q-2'],
      message: '已按当前推荐顺序生成 2 题训练单。',
    });
  });
});
