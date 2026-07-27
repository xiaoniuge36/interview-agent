import { describe, expect, it } from 'vitest';
import { isCurrentPracticeEvaluation } from './practice-evaluation-lifecycle';

describe('练习 AI 评价 settlement scope', () => {
  it('当前且未 abort 的 controller 可以结算', () => {
    const controller = new AbortController();

    expect(isCurrentPracticeEvaluation(controller, controller)).toBe(true);
  });

  it('当前但已 abort 的 controller 不能结算', () => {
    const controller = new AbortController();
    controller.abort();

    expect(isCurrentPracticeEvaluation(controller, controller)).toBe(false);
  });

  it('已被替换的 controller 不能结算', () => {
    const active = new AbortController();
    const stale = new AbortController();

    expect(isCurrentPracticeEvaluation(active, stale)).toBe(false);
  });

  it('没有活动 controller 时不能结算', () => {
    expect(isCurrentPracticeEvaluation(null, new AbortController())).toBe(false);
  });
});
