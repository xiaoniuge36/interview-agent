import { describe, expect, it } from 'vitest';
import { INTERVIEW_PAGE_INTRO, interviewStageLabel } from './interview-labels';

describe('interview labels', () => {
  it('describes the page in user language without implementation jargon', () => {
    expect(INTERVIEW_PAGE_INTRO).not.toMatch(/状态机|runtime|事件|workflow/iu);
    expect(INTERVIEW_PAGE_INTRO).toContain('按阶段');
    expect(INTERVIEW_PAGE_INTRO).toContain('复盘');
  });

  it('labels every rail stage in Chinese', () => {
    expect(interviewStageLabel('warmup')).toBe('开场破冰');
    expect(interviewStageLabel('final_evaluation')).toBe('综合评估');
  });
});
