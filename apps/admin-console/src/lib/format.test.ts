import { describe, expect, it } from 'vitest';
import { formatAdminDateTime } from './format';

// 用本地时间分量推导期望值，保证断言在任意时区的机器上都成立。
function expectedText(value: string): string {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, '0');
  const day = `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
  return `${day} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

describe('formatAdminDateTime', () => {
  it('renders zh-CN date times as YYYY/MM/DD HH:mm', () => {
    const value = '2026-07-15T06:05:00.000Z';

    expect(formatAdminDateTime(value)).toBe(expectedText(value));
    expect(formatAdminDateTime(value)).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/);
  });

  it('accepts Date inputs and keeps two-digit month, day, hour and minute', () => {
    const value = new Date('2026-01-02T03:04:00.000Z');

    expect(formatAdminDateTime(value)).toBe(expectedText(value.toISOString()));
  });
});
