import { expect, it } from 'vitest';
import {
  clearInterviewDraft,
  loadInterviewDraft,
  saveInterviewDraft,
  type InterviewDraftStorage,
} from './interview-draft';

it('isolates drafts by interview session', () => {
  const storage = memoryStorage();

  saveInterviewDraft('session-a', '回答 A', storage);
  saveInterviewDraft('session-b', '回答 B', storage);

  expect(loadInterviewDraft('session-a', storage)).toBe('回答 A');
  expect(loadInterviewDraft('session-b', storage)).toBe('回答 B');
});

it('removes an existing draft when the answer becomes blank', () => {
  const storage = memoryStorage();
  saveInterviewDraft('session-a', '待提交回答', storage);

  saveInterviewDraft('session-a', '   ', storage);

  expect(loadInterviewDraft('session-a', storage)).toBe('');
});

it('clears a submitted interview draft', () => {
  const storage = memoryStorage();
  saveInterviewDraft('session-a', '已提交回答', storage);

  clearInterviewDraft('session-a', storage);

  expect(loadInterviewDraft('session-a', storage)).toBe('');
});

it('is safe when browser session storage is unavailable', () => {
  expect(loadInterviewDraft('session-a', null)).toBe('');
  expect(() => saveInterviewDraft('session-a', '回答', null)).not.toThrow();
  expect(() => clearInterviewDraft('session-a', null)).not.toThrow();
});

it('keeps drafting usable when session storage access fails', () => {
  const unavailableStorage: InterviewDraftStorage = {
    getItem: () => {
      throw new Error('storage blocked');
    },
    setItem: () => {
      throw new Error('storage blocked');
    },
    removeItem: () => {
      throw new Error('storage blocked');
    },
  };

  expect(loadInterviewDraft('session-a', unavailableStorage)).toBe('');
  expect(() => saveInterviewDraft('session-a', '回答', unavailableStorage)).not.toThrow();
  expect(() => clearInterviewDraft('session-a', unavailableStorage)).not.toThrow();
});

function memoryStorage(): InterviewDraftStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}
