import { describe, expect, it } from 'vitest';
import { selectedChoiceIds, toggleChoiceAnswer } from './practice-choice-answer';

const options = [
  { id: 'A', text: 'ReAct' },
  { id: 'B', text: 'Plan-and-Execute' },
  { id: 'C', text: 'RAG' },
];

describe('practice choice answers', () => {
  it('restores valid selected ids in question option order', () => {
    expect(selectedChoiceIds('C,A,Z', options)).toEqual(['A', 'C']);
  });

  it('replaces the previous answer for a single-choice question', () => {
    expect(toggleChoiceAnswer({ draft: 'A', optionId: 'B', options, multiple: false })).toBe('B');
  });

  it('adds and removes multiple-choice answers in canonical order', () => {
    const added = toggleChoiceAnswer({ draft: 'C', optionId: 'A', options, multiple: true });
    expect(added).toBe('A,C');
    expect(toggleChoiceAnswer({ draft: added, optionId: 'C', options, multiple: true })).toBe('A');
  });
});
