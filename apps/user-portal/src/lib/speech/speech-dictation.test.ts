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

  it('inserts a space between latin words to avoid gluing', () => {
    expect(appendTranscript('我用了 React', 'and Redux')).toBe('我用了 React and Redux');
  });

  it('keeps CJK joining seamless on either side', () => {
    expect(appendTranscript('方案用了 Redis', '然后做了压测')).toBe('方案用了 Redis然后做了压测');
    expect(appendTranscript('背景是大促。', 'QPS 翻了三倍')).toBe('背景是大促。QPS 翻了三倍');
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
    const outcome = splitRecognitionResults(
      {
        resultIndex: 1,
        results: [
          { isFinal: true, 0: { transcript: '已经处理过' } },
          { isFinal: true, 0: { transcript: '我先说结论' } },
          { isFinal: false, 0: { transcript: '然后展开' } },
        ],
      },
      0,
    );
    expect(outcome).toEqual({
      finalTranscript: '我先说结论',
      interimTranscript: '然后展开',
      lastFinalIndex: 1,
    });
  });

  it('skips finals already consumed even when replayed from index zero', () => {
    // Android/iOS 的 continuous 实现会把已投递过的 final 再次带在事件里。
    const replayedEvent = {
      resultIndex: 0,
      results: [
        { isFinal: true, 0: { transcript: '第一句' } },
        { isFinal: true, 0: { transcript: '第二句' } },
        { isFinal: false, 0: { transcript: '第三句进行中' } },
      ],
    };
    const outcome = splitRecognitionResults(replayedEvent, 0);
    expect(outcome).toEqual({
      finalTranscript: '第二句',
      interimTranscript: '第三句进行中',
      lastFinalIndex: 1,
    });
    // 全部消费过时不再产出 final。
    expect(splitRecognitionResults(replayedEvent, 1).finalTranscript).toBe('');
  });
});
