import { describe, expect, it } from 'vitest';
import {
  INITIAL_INTERVIEW_STATE,
  interviewReducer,
  interviewSessionProgress,
} from './interview-state';

describe('interview streaming state', () => {
  it('derives only answered turns and the persisted session state', () => {
    expect(interviewSessionProgress(null)).toEqual({
      answered: 0,
      stage: null,
      status: 'idle',
    });

    expect(
      interviewSessionProgress({
        status: 'waiting_user',
        stage: 'project_deep_dive',
        turns: [{ role: 'interviewer' }, { role: 'candidate' }, { role: 'candidate' }],
      } as never),
    ).toEqual({
      answered: 2,
      stage: 'project_deep_dive',
      status: 'waiting_user',
    });
  });

  it('shows a phase and temporary content before replacing it with the persisted result', () => {
    const withPhase = interviewReducer(INITIAL_INTERVIEW_STATE, {
      type: 'stream_phase',
      phase: 'composing',
    });
    const withDelta = interviewReducer(withPhase, {
      type: 'token',
      content: '请说明你的设计取舍。',
    });
    const result = interviewReducer(withDelta, {
      type: 'stream_result',
      session: { id: 'session-1', status: 'waiting_user', turns: [] } as never,
      basisSummary: ['基于你刚才的项目描述继续追问'],
    });

    expect(withDelta.streamingText).toBe('请说明你的设计取舍。');
    expect(result.streamingText).toBe('');
    expect(result.phase).toBeNull();
    expect(result.basisSummary).toEqual(['基于你刚才的项目描述继续追问']);
  });

  it('preserves a recovered draft when archived restoration effects replay', () => {
    const restoring = interviewReducer(INITIAL_INTERVIEW_STATE, { type: 'restore_start' });
    const withRecoveredDraft = interviewReducer(restoring, {
      type: 'draft',
      draft: '当前标签页草稿',
    });
    const replayedRestore = interviewReducer(withRecoveredDraft, { type: 'restore_start' });

    expect(replayedRestore.draft).toBe('当前标签页草稿');
    expect(replayedRestore.busy).toBe(true);
    expect(interviewReducer(withRecoveredDraft, { type: 'reset' }).draft).toBe('');
  });
});
