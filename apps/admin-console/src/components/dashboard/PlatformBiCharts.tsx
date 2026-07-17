'use client';

import { Empty, Spin } from 'antd';
import type { PlatformDashboard, PlatformTrendPoint } from '@interview-agent/contracts';
import dynamic from 'next/dynamic';
import React from 'react';
import type { TrendMetric } from './platform-analytics-model';
import { toFunnelChartData, toTrendChartData } from './platform-bi-model';

const PERCENT_SCALE = 100;

const Area = dynamic(() => import('@ant-design/charts').then((module) => module.Area), {
  loading: ChartLoading,
  ssr: false,
});
const Bar = dynamic(() => import('@ant-design/charts').then((module) => module.Bar), {
  loading: ChartLoading,
  ssr: false,
});
const Gauge = dynamic(() => import('@ant-design/charts').then((module) => module.Gauge), {
  loading: ChartLoading,
  ssr: false,
});

export function PlatformTrendArea({
  metric,
  trend,
}: {
  metric: TrendMetric;
  trend: PlatformTrendPoint[];
}) {
  const data = toTrendChartData(trend, metric);
  if (!data.length) return <Empty description="当前窗口没有趋势数据" />;
  return (
    <Area
      area={{ style: { fill: 'l(270) 0:#d9efff 1:#ffffff' } }}
      axis={{ x: { title: false }, y: { grid: true, title: false } }}
      colorField="metric"
      data={data}
      height={276}
      line={{ style: { lineWidth: 2.5 } }}
      scale={{ color: { range: ['#1677ff'] }, y: { nice: true } }}
      tooltip={{ title: 'date' }}
      xField="date"
      yField="value"
    />
  );
}

export function PlatformRuntimeGauge({ runtime }: { runtime: PlatformDashboard['runtime'] }) {
  return (
    <Gauge
      axis={{ labelFormatter: (datum: number) => String(Math.round(datum * PERCENT_SCALE)) + '%' }}
      color="#1677ff"
      height={220}
      indicator={{
        formatter: () => `${runtime.successRate}%`,
        style: { fontSize: 28, fontWeight: 700, fill: '#102a43' },
      }}
      percent={runtime.successRate / PERCENT_SCALE}
      range={{ color: '#d9efff' }}
      style={{ radius: 0.9 }}
    />
  );
}

export function PlatformFunnelBar({ funnel }: { funnel: PlatformDashboard['funnel'] }) {
  return (
    <Bar
      axis={{ x: { grid: true, title: false }, y: { title: false } }}
      colorField="tone"
      data={toFunnelChartData(funnel)}
      height={276}
      label={{ text: 'value' }}
      legend={false}
      scale={{ color: { range: ['#91caff', '#faad14', '#1677ff', '#91d5ff', '#52c41a'] } }}
      style={{ radius: 6 }}
      tooltip={{ title: 'stage' }}
      xField="value"
      yField="stage"
    />
  );
}

function ChartLoading() {
  return (
    <div className="platform-chart-loading">
      <Spin size="small" />
    </div>
  );
}
