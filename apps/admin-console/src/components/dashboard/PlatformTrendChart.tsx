'use client';

import { Card, Segmented, Statistic, Typography } from 'antd';
import type { PlatformTrendPoint } from '@interview-agent/contracts';
import React, { useState } from 'react';
import { PlatformTrendArea } from './PlatformBiCharts';
import type { TrendMetric } from './platform-analytics-model';

const TREND_OPTIONS: { label: string; value: TrendMetric }[] = [
  { label: 'Agent 调用', value: 'agentRuns' },
  { label: '训练完成', value: 'trainingCompleted' },
  { label: '新增发布题', value: 'questionsPublished' },
  { label: '新增账号', value: 'accountsCreated' },
];

export function PlatformTrendChart({ trend }: { trend: PlatformTrendPoint[] }) {
  const [metric, setMetric] = useState<TrendMetric>('agentRuns');
  const option = trendOption(metric);
  const latest = trend.at(-1)?.[metric] ?? 0;
  return (
    <Card
      className="admin-dense-card platform-bi-trend-card"
      extra={<Segmented options={TREND_OPTIONS} value={metric} onChange={(value) => setMetric(value as TrendMetric)} />}
      title="经营趋势"
    >
      <div className="platform-bi-chart-heading">
        <div>
          <Typography.Text type="secondary">{option.label}</Typography.Text>
          <Statistic value={latest} />
        </div>
        <Typography.Text type="secondary">按 UTC 日期统计</Typography.Text>
      </div>
      <div className="platform-bi-chart-area"><PlatformTrendArea metric={metric} trend={trend} /></div>
    </Card>
  );
}

function trendOption(metric: TrendMetric) {
  const option = TREND_OPTIONS.find((item) => item.value === metric);
  if (option) return option;
  throw new Error(`Unknown platform trend metric: ${metric}`);
}
