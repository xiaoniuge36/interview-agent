// 为什么：治理后台各列表曾混用 short/medium 等日期风格，统一收敛为
// zh-CN「YYYY/MM/DD HH:mm」，避免同一时间在不同页面呈现不一致。
const ADMIN_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function formatAdminDateTime(value: string | number | Date): string {
  return ADMIN_DATE_TIME_FORMATTER.format(new Date(value));
}
