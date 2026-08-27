import type { QuestionCatalogResponse } from '@interview-agent/contracts';
import { describe, expect, it } from 'vitest';
import {
  readQuestionSelection,
  writeQuestionSelection,
  type QuestionSelectionStorage,
} from './question-selection-storage';

type CatalogQuestion = QuestionCatalogResponse['items'][number];

describe('question selection storage', () => {
  it('restores a selected question after a page reload', () => {
    const storage = createMemoryStorage();
    const selected = [question('question-1')];

    writeQuestionSelection(storage, selected);

    expect(JSON.parse(storage.getItem('interview-agent:question-selection:v1') ?? '')).toEqual({
      version: 1,
      items: [{ id: 'question-1', title: 'Recoverable Agent workflows' }],
    });
    expect(readQuestionSelection(storage)).toEqual([
      { id: 'question-1', title: 'Recoverable Agent workflows' },
    ]);
  });

  it('falls back safely when stored selection data is damaged', () => {
    const storage = createMemoryStorage();
    storage.setItem('interview-agent:question-selection:v1', '{damaged');

    expect(readQuestionSelection(storage)).toEqual([]);
  });

  it('rejects duplicate IDs and selections beyond ten questions', () => {
    const duplicateStorage = createMemoryStorage();
    duplicateStorage.setItem(
      'interview-agent:question-selection:v1',
      JSON.stringify({
        version: 1,
        items: [
          { id: 'question-1', title: 'First title' },
          { id: 'question-1', title: 'Duplicate title' },
        ],
      }),
    );
    const oversizedStorage = createMemoryStorage();
    oversizedStorage.setItem(
      'interview-agent:question-selection:v1',
      JSON.stringify({
        version: 1,
        items: Array.from({ length: 11 }, (_, index) => ({
          id: `question-${index}`,
          title: `Question ${index}`,
        })),
      }),
    );

    expect(readQuestionSelection(duplicateStorage)).toEqual([]);
    expect(readQuestionSelection(oversizedStorage)).toEqual([]);
  });
});

function createMemoryStorage(): QuestionSelectionStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

function question(id: string): CatalogQuestion {
  return {
    id,
    tenantId: 'tenant-1',
    visibility: 'public',
    title: 'Recoverable Agent workflows',
    stem: 'Explain checkpoint and resume boundaries.',
    type: 'system_design',
    difficulty: 'medium',
    tags: ['Agent', 'Reliability'],
    companies: [],
    sourceRefs: [],
    status: 'published',
  };
}
