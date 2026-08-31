import { describe, expect, it } from 'vitest';
import {
  formatClockTime,
  formatDate,
  formatDateTime,
  formatScoreOutOf100,
  roundScore,
} from './format';

// 固定时区断言，避免测试机时区影响结果；业务代码不传 timeZone，跟随用户本地时区
const SHANGHAI = { timeZone: 'Asia/Shanghai' };

describe('format', () => {
  it('renders zh-CN date-time in the viewer time zone instead of raw UTC slices', () => {
    // UTC 03:05 = 上海 11:05：若实现退化回 slice(11,16) 会得到 03:05
    expect(formatDateTime('2026-08-31T03:05:00.000Z', SHANGHAI)).toBe('2026/08/31 11:05');
  });

  it('renders date-only and clock-only variants from the same instant', () => {
    expect(formatDate('2026-12-31T20:00:00.000Z', SHANGHAI)).toBe('2027/01/01');
    expect(formatClockTime('2026-08-31T03:05:00.000Z', SHANGHAI)).toBe('11:05');
  });

  it('rounds scores and renders the unified out-of-100 caption', () => {
    expect(roundScore(86.4)).toBe(86);
    expect(roundScore(86.5)).toBe(87);
    expect(formatScoreOutOf100(72.49)).toBe('72 / 100');
  });
});
