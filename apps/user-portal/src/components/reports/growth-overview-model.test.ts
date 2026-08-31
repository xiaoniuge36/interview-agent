import { describe, expect, it } from 'vitest';
import type { MasteryProfile } from '@interview-agent/contracts';
import {
  RADAR_MAX_AXES,
  TREND_MAX_POINTS,
  buildRadarAxes,
  buildTrendPoints,
  selectRadarProfiles,
  trendPolyline,
} from './growth-overview-model';
import type { TrainingRecord } from './training-records-model';

function profile(tag: string, score: number, evidenceCount = 3): MasteryProfile {
  return {
    id: `mastery-${tag}`,
    tenantId: 'tenant-1',
    userId: 'user-1',
    tag,
    score,
    evidenceCount,
    lastEvidenceSessionId: null,
    updatedAt: '2026-08-27T00:00:00.000Z',
  };
}

function record(overrides: Partial<TrainingRecord>): TrainingRecord {
  return {
    id: 'record-1',
    kind: 'practice',
    title: '训练',
    updatedAt: '2026-08-01T00:00:00.000Z',
    status: 'report_ready',
    href: '/practice/record-1',
    score: 80,
    facts: [],
    signals: [],
    trend: null,
    ...overrides,
  };
}

describe('selectRadarProfiles', () => {
  it('prefers tags with more evidence and caps the axis count', () => {
    const profiles = [
      profile('A', 60, 1),
      profile('B', 70, 9),
      profile('C', 50, 5),
      profile('D', 90, 4),
      profile('E', 40, 3),
      profile('F', 55, 2),
      profile('G', 65, 8),
    ];
    const selected = selectRadarProfiles(profiles);
    expect(selected).toHaveLength(RADAR_MAX_AXES);
    expect(selected[0]!.tag).toBe('B');
    expect(selected.map((item) => item.tag)).not.toContain('A');
  });

  it('drops tags without evidence', () => {
    expect(selectRadarProfiles([profile('A', 88, 0)])).toHaveLength(0);
  });
});

describe('buildRadarAxes', () => {
  it('returns no axes when fewer than three tags are available', () => {
    expect(buildRadarAxes([profile('A', 80), profile('B', 70)])).toHaveLength(0);
  });

  it('places the first axis straight up and scales points by score', () => {
    const axes = buildRadarAxes([profile('A', 50), profile('B', 100), profile('C', 0)]);
    expect(axes).toHaveLength(3);
    // 同等证据数时分数高者排前：B(100) 为第一轴，垂直向上且顶点与外圈重合。
    const first = axes[0]!;
    expect(first.tag).toBe('B');
    expect(first.point.x).toBeCloseTo(120, 0);
    expect(first.point.y).toBeCloseTo(120 - 82, 0);
    expect(first.outer.y).toBeCloseTo(120 - 82, 0);
    // C(0) 的数据顶点收缩到圆心。
    const zero = axes.find((axis) => axis.tag === 'C')!;
    expect(zero.point.x).toBeCloseTo(120, 0);
    expect(zero.point.y).toBeCloseTo(120, 0);
  });
});

describe('buildTrendPoints', () => {
  it('needs at least two scored records', () => {
    expect(buildTrendPoints([record({ score: 90 })])).toHaveLength(0);
    expect(buildTrendPoints([record({ score: null })])).toHaveLength(0);
  });

  it('orders points by time and maps the score range onto the viewbox', () => {
    const points = buildTrendPoints([
      record({ id: 'later', score: 90, updatedAt: '2026-08-10T00:00:00.000Z' }),
      record({ id: 'earlier', score: 60, updatedAt: '2026-08-01T00:00:00.000Z' }),
    ]);
    expect(points).toHaveLength(2);
    expect(points[0]!.score).toBe(60);
    expect(points[1]!.score).toBe(90);
    expect(points[0]!.y).toBeGreaterThan(points[1]!.y);
    expect(trendPolyline(points)).toBe(
      `${points[0]!.x},${points[0]!.y} ${points[1]!.x},${points[1]!.y}`,
    );
  });

  it('keeps only the most recent points when history is long', () => {
    const records = Array.from({ length: 30 }, (_, index) =>
      record({
        id: `record-${index}`,
        score: 50 + index,
        updatedAt: `2026-07-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
      }),
    );
    const points = buildTrendPoints(records);
    expect(points).toHaveLength(TREND_MAX_POINTS);
    expect(points.at(-1)!.score).toBe(79);
  });

  it('centers a flat series vertically', () => {
    const points = buildTrendPoints([
      record({ id: 'a', score: 75, updatedAt: '2026-08-01T00:00:00.000Z' }),
      record({ id: 'b', score: 75, updatedAt: '2026-08-02T00:00:00.000Z' }),
    ]);
    expect(points[0]!.y).toBe(points[1]!.y);
  });
});
