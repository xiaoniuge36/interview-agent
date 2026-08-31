/**
 * 全站展示层格式化约定：
 * - 时间一律 zh-CN 本地时区渲染，杜绝 `iso.slice(...)` 这类 UTC 直出；
 *   列表统一「YYYY/MM/DD HH:mm」，纯日期用「YYYY/MM/DD」，当日事件流用「HH:mm」。
 * - 分数一律四舍五入取整，对外口径统一为「X / 100」。
 * 测试可传 timeZone 固定时区，业务代码不传（跟随用户本地时区）。
 */
type ZonedOptions = { timeZone?: string };

function zhFormatter(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('zh-CN', { hour12: false, ...options });
}

export function formatDateTime(iso: string, options?: ZonedOptions): string {
  return zhFormatter({
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: options?.timeZone,
  }).format(new Date(iso));
}

export function formatDate(iso: string, options?: ZonedOptions): string {
  return zhFormatter({
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: options?.timeZone,
  }).format(new Date(iso));
}

export function formatClockTime(iso: string, options?: ZonedOptions): string {
  return zhFormatter({
    hour: '2-digit',
    minute: '2-digit',
    timeZone: options?.timeZone,
  }).format(new Date(iso));
}

export function roundScore(value: number): number {
  return Math.round(value);
}

export function formatScoreOutOf100(value: number): string {
  return `${roundScore(value)} / 100`;
}
