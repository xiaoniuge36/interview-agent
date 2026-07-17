import type { PlatformTrendPoint } from '@interview-agent/contracts';

const HEALTHY_SUCCESS_RATE = 95;
const ATTENTION_SUCCESS_RATE = 85;
const HEALTHY_SCHEMA_RATE = 95;
const ATTENTION_SCHEMA_RATE = 90;
const PERCENT_SCALE = 100;

export type TrendMetric = keyof Omit<PlatformTrendPoint, 'date'>;

export function platformHealth(input: {
  runs: number;
  successRate: number;
  schemaPassRate: number;
  fallbacks: number;
}) {
  if (input.runs === 0)
    return { level: 'quiet', label: '暂无运行', description: '当前窗口没有 Agent 调用。' };
  if (input.successRate < ATTENTION_SUCCESS_RATE || input.schemaPassRate < ATTENTION_SCHEMA_RATE) {
    return {
      level: 'critical',
      label: '需要处理',
      description: '运行成功率或结构化结果低于安全阈值。',
    };
  }
  if (
    input.successRate < HEALTHY_SUCCESS_RATE ||
    input.schemaPassRate < HEALTHY_SCHEMA_RATE ||
    input.fallbacks > 0
  ) {
    return {
      level: 'attention',
      label: '持续观察',
      description: '存在降级或质量指标未达到健康阈值。',
    };
  }
  return {
    level: 'healthy',
    label: '运行健康',
    description: '运行成功率与结构化结果均处于健康范围。',
  };
}

export function buildTrendGeometry(points: PlatformTrendPoint[], metric: TrendMetric) {
  const max = Math.max(1, ...points.map((point) => point[metric]));
  const lastIndex = Math.max(1, points.length - 1);
  return points.map((point, index) => ({
    date: point.date,
    value: point[metric],
    x: (index / lastIndex) * PERCENT_SCALE,
    y: PERCENT_SCALE - (point[metric] / max) * PERCENT_SCALE,
  }));
}

export function trendPath(points: ReturnType<typeof buildTrendGeometry>) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

export function safePercent(value: number, total: number) {
  return total === 0 ? 0 : Number(((value / total) * PERCENT_SCALE).toFixed(1));
}
