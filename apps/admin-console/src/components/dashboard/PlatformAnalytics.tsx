'use client';

import {
  Card,
  Empty,
  Segmented,
  Statistic,
  Table,
  Tag,
  Typography,
  type TableColumnsType,
} from 'antd';
import type { PlatformDashboard, PlatformDashboardPeriod } from '@interview-agent/contracts';
import React, { useEffect, useState } from 'react';
import { AdminApiError } from '@/lib/api';
import { getPlatformDashboard } from '@/lib/platform-api';
import { PlatformFunnel } from './PlatformFunnel';
import { PlatformHealthSummary } from './PlatformHealthSummary';
import { PlatformRuntimeGauge } from './PlatformBiCharts';
import { PlatformTrendChart } from './PlatformTrendChart';
import { SectionFeedback } from './SectionState';

const HTTP_FORBIDDEN = 403;
const RUNTIME_STABLE_RATE = 95;
const RUNTIME_ATTENTION_RATE = 80;
const PERIOD_OPTIONS: { label: string; value: PlatformDashboardPeriod }[] = [
  { label: '今日', value: 'today' },
  { label: '近 7 天', value: '7d' },
  { label: '近 30 天', value: '30d' },
];
const TIME_FORMATTER = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short', timeStyle: 'short' });

type DashboardState =
  | { status: 'loading' }
  | { status: 'ready'; data: PlatformDashboard }
  | { status: 'forbidden'; access: 'platform-only' }
  | { status: 'error'; error: AdminApiError };

export function PlatformAnalytics({ active, refreshKey }: { active: boolean; refreshKey: number }) {
  const [period, setPeriod] = useState<PlatformDashboardPeriod>('7d');
  const state = usePlatformDashboard(active, period, refreshKey);

  return (
    <section className="admin-page platform-pulse-page" aria-labelledby="analytics-heading">
      <div className="admin-page-heading admin-page-heading-actions">
        <div>
          <div className="eyebrow">Platform Operations</div>
          <h2 id="analytics-heading">数据看板</h2>
          <p>从内容供给、训练使用到 Agent 运行质量，查看平台经营健康。</p>
        </div>
        <Segmented
          options={PERIOD_OPTIONS}
          value={period}
          onChange={(value) => setPeriod(value as PlatformDashboardPeriod)}
        />
      </div>
      {state.status === 'ready' ? <PlatformAnalyticsContent dashboard={state.data} /> : null}
      {state.status !== 'ready' ? (
        <SectionFeedback state={state} loadingMessage="正在汇总全站运营数据" />
      ) : null}
    </section>
  );
}

export function PlatformAnalyticsContent({ dashboard }: { dashboard: PlatformDashboard }) {
  return (
    <div className="platform-pulse-content">
      <PlatformHealthSummary dashboard={dashboard} />
      <div className="platform-bi-grid platform-bi-grid-primary">
        <PlatformTrendChart trend={dashboard.trend} />
        <RuntimeQuality dashboard={dashboard} />
      </div>
      <div className="platform-bi-grid platform-bi-grid-secondary">
        <PlatformFunnel dashboard={dashboard} />
        <RecentFailures dashboard={dashboard} />
      </div>
    </div>
  );
}

function RuntimeQuality({ dashboard }: { dashboard: PlatformDashboard }) {
  const { runtime } = dashboard;
  const successTone =
    runtime.successRate >= RUNTIME_STABLE_RATE
      ? 'success'
      : runtime.successRate >= RUNTIME_ATTENTION_RATE
        ? 'warning'
        : 'error';
  const successStatus = runtime.successRate >= RUNTIME_STABLE_RATE ? '稳定' : '需关注';

  return (
    <Card
      className="admin-dense-card platform-bi-runtime-card"
      extra={<Tag color={successTone}>{successStatus}</Tag>}
      title="运行质量"
    >
      <div className="platform-bi-runtime-gauge">
        <PlatformRuntimeGauge runtime={runtime} />
      </div>
      <div className="platform-bi-runtime-stats">
        <Statistic suffix="%" title="Schema 通过率" value={runtime.schemaPassRate} />
        <Statistic suffix="ms" title="平均延迟" value={Math.round(runtime.averageLatencyMs)} />
        <Statistic title="降级次数" value={runtime.fallbacks} />
      </div>
      <Typography.Text className="platform-bi-runtime-hint" type="secondary">
        成功率由当前周期全部 Agent 运行记录计算。
      </Typography.Text>
    </Card>
  );
}

function RecentFailures({ dashboard }: { dashboard: PlatformDashboard }) {
  const failures = dashboard.runtime.recentFailures;

  return (
    <Card className="admin-dense-card platform-bi-failures-card" title="近期运行风险">
      {failures.length ? (
        <Table
          columns={RUN_COLUMNS}
          dataSource={failures}
          pagination={false}
          rowKey="id"
          size="small"
        />
      ) : (
        <Empty description="当前窗口没有失败或降级运行" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </Card>
  );
}

const RUN_COLUMNS: TableColumnsType<PlatformDashboard['runtime']['recentFailures'][number]> = [
  { title: '阶段', dataIndex: 'stage' },
  { title: '状态', dataIndex: 'status' },
  {
    title: '耗时',
    dataIndex: 'latencyMs',
    render: (value) => (value === null ? '—' : String(value) + ' ms'),
  },
  {
    title: '更新时间',
    dataIndex: 'updatedAt',
    render: (value) => TIME_FORMATTER.format(new Date(value)),
  },
];

function usePlatformDashboard(
  active: boolean,
  period: PlatformDashboardPeriod,
  refreshKey: number,
): DashboardState {
  const [state, setState] = useState<DashboardState>({ status: 'loading' });

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    setState({ status: 'loading' });
    void getPlatformDashboard(period, controller.signal)
      .then((data) => setState({ status: 'ready', data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const normalized = normalizeError(error);
        setState(
          normalized.status === HTTP_FORBIDDEN
            ? { status: 'forbidden', access: 'platform-only' }
            : { status: 'error', error: normalized },
        );
      });

    return () => controller.abort();
  }, [active, period, refreshKey]);

  return state;
}

function normalizeError(error: unknown): AdminApiError {
  return error instanceof AdminApiError
    ? error
    : new AdminApiError({
        message: error instanceof Error ? error.message : '数据看板加载失败。',
        code: 'PLATFORM_DASHBOARD_ERROR',
        cause: error,
      });
}
