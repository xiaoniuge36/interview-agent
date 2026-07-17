import type { PlatformTrendPoint } from '@interview-agent/contracts';
import { describe, expect, it } from 'vitest';
import { buildTrendGeometry, platformHealth } from './platform-analytics-model';

const point: PlatformTrendPoint = {
  date: '2026-07-16',
  accountsCreated: 0,
  questionsPublished: 0,
  trainingCompleted: 0,
  agentRuns: 0,
};

describe('platform analytics model', () => {
  it('classifies a stable runtime as healthy', () => {
    expect(
      platformHealth({ runs: 12, successRate: 98, schemaPassRate: 99, fallbacks: 0 }),
    ).toMatchObject({ level: 'healthy', label: '运行健康' });
  });

  it('creates a readable zero-value trend point', () => {
    expect(buildTrendGeometry([point], 'agentRuns')).toEqual([
      expect.objectContaining({ date: '2026-07-16', value: 0 }),
    ]);
  });
});
