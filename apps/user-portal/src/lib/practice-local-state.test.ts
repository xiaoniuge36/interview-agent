import { expect, it } from 'vitest';
import {
  clearPracticeDraft,
  clearPracticeLocalState,
  loadPracticeLocalState,
  savePracticeDraft,
  savePracticeIndex,
  type PracticeLocalStorage,
} from './practice-local-state';

it('isolates drafts and current question by practice session', () => {
  const storage = memoryStorage();

  savePracticeDraft({ sessionId: 'session-a', itemId: 'item-1', draft: '回答 A' }, storage);
  savePracticeDraft({ sessionId: 'session-b', itemId: 'item-1', draft: '回答 B' }, storage);
  savePracticeIndex('session-a', 2, storage);

  expect(loadPracticeLocalState('session-a', storage)).toEqual({
    drafts: { 'item-1': '回答 A' },
    currentIndex: 2,
  });
  expect(loadPracticeLocalState('session-b', storage)).toEqual({
    drafts: { 'item-1': '回答 B' },
    currentIndex: null,
  });
});

it('removes blank drafts without clearing the saved question index', () => {
  const storage = memoryStorage();
  savePracticeIndex('session-a', 1, storage);
  savePracticeDraft({ sessionId: 'session-a', itemId: 'item-1', draft: '待保存' }, storage);

  savePracticeDraft({ sessionId: 'session-a', itemId: 'item-1', draft: '  ' }, storage);

  expect(loadPracticeLocalState('session-a', storage)).toEqual({ drafts: {}, currentIndex: 1 });
});

it('clears one saved draft or the complete local snapshot', () => {
  const storage = memoryStorage();
  savePracticeDraft({ sessionId: 'session-a', itemId: 'item-1', draft: '回答 1' }, storage);
  savePracticeDraft({ sessionId: 'session-a', itemId: 'item-2', draft: '回答 2' }, storage);

  clearPracticeDraft('session-a', 'item-1', storage);
  expect(loadPracticeLocalState('session-a', storage).drafts).toEqual({ 'item-2': '回答 2' });

  clearPracticeLocalState('session-a', storage);
  expect(loadPracticeLocalState('session-a', storage)).toEqual({ drafts: {}, currentIndex: null });
});

it('discards malformed or invalid stored values', () => {
  const storage = memoryStorage();
  storage.setItem(
    'offerpilot:practice-local-state:session-a',
    JSON.stringify({ drafts: { valid: '回答', empty: ' ', invalid: 42 }, currentIndex: -1 }),
  );

  expect(loadPracticeLocalState('session-a', storage)).toEqual({
    drafts: { valid: '回答' },
    currentIndex: null,
  });
  storage.setItem('offerpilot:practice-local-state:session-a', '{broken');
  expect(loadPracticeLocalState('session-a', storage)).toEqual({ drafts: {}, currentIndex: null });
});

it('keeps practice usable when session storage access fails', () => {
  const storage = unavailableStorage();

  expect(loadPracticeLocalState('session-a', storage)).toEqual({ drafts: {}, currentIndex: null });
  expect(() =>
    savePracticeDraft({ sessionId: 'session-a', itemId: 'item-1', draft: '回答' }, storage),
  ).not.toThrow();
  expect(() => savePracticeIndex('session-a', 1, storage)).not.toThrow();
  expect(() => clearPracticeDraft('session-a', 'item-1', storage)).not.toThrow();
  expect(() => clearPracticeLocalState('session-a', storage)).not.toThrow();
});

function memoryStorage(): PracticeLocalStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

function unavailableStorage(): PracticeLocalStorage {
  const fail = () => {
    throw new Error('storage blocked');
  };
  return { getItem: fail, setItem: fail, removeItem: fail };
}
