import { describe, expect, it } from 'vitest';
import { interviewErrorMessage, interviewStatusNotice } from './interview-feedback';

describe('interviewStatusNotice', () => {
  it('uses the shared STAR wording when it is the candidate turn', () => {
    const notice = interviewStatusNotice('waiting_user');

    expect(notice).toContain('背景、任务、行动、结果（STAR）');
    expect(notice).not.toContain('背景、目标、行动、结果');
  });
});

describe('interviewErrorMessage', () => {
  it('hides internal service terms from the user', () => {
    expect(interviewErrorMessage(new Error('Product API unavailable'))).toBe(
      '训练服务暂时不可用，请稍后重试。',
    );
    expect(interviewErrorMessage(new Error('请先完成上一题。'))).toBe('请先完成上一题。');
  });
});
