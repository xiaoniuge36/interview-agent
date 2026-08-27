import { describe, expect, it } from 'vitest';
import {
  IDLE_DICTATION,
  appendTranscript,
  dictationReducer,
  splitRecognitionResults,
} from './speech-dictation';

describe('appendTranscript', () => {
  it('starts a fresh draft without leading whitespace', () => {
    expect(appendTranscript('', '我负责订单系统改造')).toBe('我负责订单系统改造');
    expect(appendTranscript('   ', '我负责订单系统改造')).toBe('我负责订单系统改造');
  });

  it('continues an existing draft and trims trailing whitespace first', () => {
    expect(appendTranscript('背景是大促流量。\n', '我先做了容量评估')).toBe(
      '背景是大促流量。我先做了容量评估',
    );
  });

  it('ignores blank recognition results', () => {
    expect(appendTranscript('原稿', '   ')).toBe('原稿');
  });
});

describe('dictationReducer', () => {
  it('walks through a listening session', () => {
    let state = dictationReducer(IDLE_DICTATION, { type: 'start' });
    expect(state).toEqual({ listening: true, interim: '', error: null });
    state = dictationReducer(state, { type: 'interim', transcript: '我负责' });
    expect(state.interim).toBe('我负责');
    state = dictationReducer(state, { type: 'final' });
    expect(state.interim).toBe('');
    state = dictationReducer(state, { type: 'end' });
    expect(state.listening).toBe(false);
  });

  it('maps permission errors to a friendly message and stops listening', () => {
    const state = dictationReducer(
      { listening: true, interim: '试试', error: null },
      { type: 'error', code: 'not-allowed' },
    );
    expect(state.listening).toBe(false);
    expect(state.error).toContain('麦克风权限');
  });

  it('clears a previous error when listening restarts', () => {
    const errored = dictationReducer(IDLE_DICTATION, { type: 'error', code: 'no-speech' });
    expect(dictationReducer(errored, { type: 'start' }).error).toBeNull();
  });
});

describe('splitRecognitionResults', () => {
  it('separates final and interim transcripts from the result index', () => {
    const outcome = splitRecognitionResults({
      resultIndex: 1,
      results: [
        { isFinal: true, 0: { transcript: '已经处理过' } },
        { isFinal: true, 0: { transcript: '我先说结论' } },
        { isFinal: false, 0: { transcript: '然后展开' } },
      ],
    });
    expect(outcome).toEqual({ finalTranscript: '我先说结论', interimTranscript: '然后展开' });
  });
});
