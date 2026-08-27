import type { MasteryProfile } from '@interview-agent/contracts';
import type { TrainingRecord } from './training-records-model';

export const RADAR_SIZE = 240;
export const RADAR_RADIUS = 82;
export const RADAR_MIN_AXES = 3;
export const RADAR_MAX_AXES = 6;

export const TREND_WIDTH = 320;
export const TREND_HEIGHT = 132;
export const TREND_PADDING_X = 18;
export const TREND_PADDING_Y = 22;
export const TREND_MAX_POINTS = 20;
export const TREND_MIN_POINTS = 2;

const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_LABEL_OFFSET = 26;
const FULL_SCORE = 100;
const HALF = 0.5;

export type RadarAxis = {
  tag: string;
  score: number;
  /** 数据多边形顶点 */
  point: { x: number; y: number };
  /** 满分网格顶点 */
  outer: { x: number; y: number };
  /** 轴标签锚点 */
  label: { x: number; y: number };
};

export type TrendPoint = {
  x: number;
  y: number;
  score: number;
  kind: TrainingRecord['kind'];
  date: string;
  title: string;
};

/** 证据最充分的能力标签优先入图，最多六轴；不足三轴时雷达不可读，调用方应降级为列表。 */
export function selectRadarProfiles(profiles: readonly MasteryProfile[]): MasteryProfile[] {
  return [...profiles]
    .filter((profile) => profile.evidenceCount > 0)
    .sort((a, b) => b.evidenceCount - a.evidenceCount || b.score - a.score)
    .slice(0, RADAR_MAX_AXES);
}

export function buildRadarAxes(profiles: readonly MasteryProfile[]): RadarAxis[] {
  const selected = selectRadarProfiles(profiles);
  if (selected.length < RADAR_MIN_AXES) return [];
  return selected.map((profile, index) => {
    const angle = axisAngle(index, selected.length);
    const ratio = clampScore(profile.score) / FULL_SCORE;
    return {
      tag: profile.tag,
      score: Math.round(profile.score),
      point: polarPoint(angle, RADAR_RADIUS * ratio),
      outer: polarPoint(angle, RADAR_RADIUS),
      label: polarPoint(angle, RADAR_RADIUS + RADAR_LABEL_OFFSET),
    };
  });
}

export function radarPolygon(axes: readonly RadarAxis[], scale = 1): string {
  return axes
    .map((axis) => {
      const x = RADAR_CENTER + (axis.outer.x - RADAR_CENTER) * scale;
      const y = RADAR_CENTER + (axis.outer.y - RADAR_CENTER) * scale;
      return `${round(x)},${round(y)}`;
    })
    .join(' ');
}

export function radarValuePolygon(axes: readonly RadarAxis[]): string {
  return axes.map((axis) => `${round(axis.point.x)},${round(axis.point.y)}`).join(' ');
}

/** 已评分的训练按时间升序取最近 N 条，纵轴按分数区间自适应，避免高分段波动被压平。 */
export function buildTrendPoints(records: readonly TrainingRecord[]): TrendPoint[] {
  const scored = records
    .filter((record): record is TrainingRecord & { score: number } => record.score !== null)
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
    .slice(-TREND_MAX_POINTS);
  if (scored.length < TREND_MIN_POINTS) return [];
  const scores = scored.map((record) => record.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const span = Math.max(max - min, 1);
  const innerWidth = TREND_WIDTH - TREND_PADDING_X * 2;
  const innerHeight = TREND_HEIGHT - TREND_PADDING_Y * 2;
  const step = scored.length > 1 ? innerWidth / (scored.length - 1) : 0;
  return scored.map((record, index) => {
    const ratio = max === min ? HALF : (record.score - min) / span;
    return {
      x: round(TREND_PADDING_X + step * index),
      y: round(TREND_PADDING_Y + innerHeight * (1 - ratio)),
      score: Math.round(record.score),
      kind: record.kind,
      date: record.updatedAt,
      title: record.title,
    };
  });
}

export function trendPolyline(points: readonly TrendPoint[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

function axisAngle(index: number, total: number) {
  return -Math.PI / 2 + (2 * Math.PI * index) / total;
}

function polarPoint(angle: number, radius: number) {
  return {
    x: round(RADAR_CENTER + radius * Math.cos(angle)),
    y: round(RADAR_CENTER + radius * Math.sin(angle)),
  };
}

function clampScore(score: number) {
  return Math.min(Math.max(score, 0), FULL_SCORE);
}

const ROUND_PRECISION = 10;

function round(value: number) {
  return Math.round(value * ROUND_PRECISION) / ROUND_PRECISION;
}
