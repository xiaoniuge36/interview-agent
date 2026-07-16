'use client';

import {
  Card,
  Col,
  Empty,
  Progress,
  Row,
  Segmented,
  Statistic,
  Table,
  Typography,
  type TableColumnsType,
} from 'antd';
import type { PlatformDashboard, PlatformDashboardPeriod } from '@interview-agent/contracts';
import React, { useEffect, useState } from 'react';
import { AdminApiError } from '@/lib/api';
import { getPlatformDashboard } from '@/lib/platform-api';
import { SectionFeedback } from './SectionState';

const GUTTER = 12;
const HTTP_FORBIDDEN = 403;
const PERCENT_SCALE = 100;
const SUCCESS_RATE_HEALTHY = 95;
const PERIOD_OPTIONS: { label: string; value: PlatformDashboardPeriod }[] = [
  { label: '今日', value: 'today' },
  { label: '近 7 天', value: '7d' },
  { label: '近 30 天', value: '30d' },
];
const TIME_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'short',
  timeStyle: 'short',
});

type DashboardState =
  | { status: 'loading' }
  | { status: 'ready'; data: PlatformDashboard }
  | { status: 'forbidden'; access: 'platform-only' }
  | { status: 'error'; error: AdminApiError };

export function PlatformAnalytics({ active, refreshKey }: { active: boolean; refreshKey: number }) {
  const [period, setPeriod] = useState<PlatformDashboardPeriod>('7d');
  const state = usePlatformDashboard(active, period, refreshKey);
  return (
    <section className="admin-page" aria-labelledby="analytics-heading">
      <div className="admin-page-heading">
        <div>
          <div className="eyebrow">Platform Analytics</div>
          <h2 id="analytics-heading">数据看板</h2>
        </div>
        <Segmented
          options={PERIOD_OPTIONS}
          value={period}
          onChange={(value) => setPeriod(value as PlatformDashboardPeriod)}
        />
      </div>
      {state.status === 'ready' ? <PlatformAnalyticsContent dashboard={state.data} /> : null}
      {state.status !== 'ready' ? (
        <SectionFeedback state={state} loadingMessage="正在汇总全站数据" />
      ) : null}
    </section>
  );
}

export function PlatformAnalyticsContent({ dashboard }: { dashboard: PlatformDashboard }) {
  return (
    <div className="platform-analytics-content">
      <MetricSection title="账号概况">
        <Metric label="已注册账号" value={dashboard.accounts.total} />
        <Metric label="窗口新增" value={dashboard.accounts.created} />
        <Metric label="活跃账号" value={dashboard.accounts.active} />
        <Metric label="已禁用账号" value={dashboard.accounts.disabled} />
        <Metric label="租户数" value={dashboard.accounts.tenants} />
        <Metric
          label="后台 / 用户端"
          value={`${dashboard.accounts.admin} / ${dashboard.accounts.users}`}
        />
      </MetricSection>
      <Row gutter={[GUTTER, GUTTER]}>
        <Col lg={12} xs={24}>
          <ContentFunnel dashboard={dashboard} />
        </Col>
        <Col lg={12} xs={24}>
          <TrainingMetrics dashboard={dashboard} />
        </Col>
      </Row>
      <RuntimeMetrics dashboard={dashboard} />
    </div>
  );
}

function MetricSection({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <Card className="admin-dense-card" title={title}>
      <Row gutter={[GUTTER, GUTTER]}>{children}</Row>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <Col lg={4} sm={8} xs={12}>
      <Statistic title={label} value={value} />
    </Col>
  );
}

function ContentFunnel({ dashboard }: { dashboard: PlatformDashboard }) {
  const { content } = dashboard;
  return (
    <Card className="admin-dense-card" title="内容漏斗">
      <Row gutter={[GUTTER, GUTTER]}>
        <Metric label="导入任务" value={content.imports} />
        <Metric label="待审核候选题" value={content.pendingCandidates} />
        <Metric label="已发布题目" value={content.publishedQuestions} />
        <Metric label="失败导入" value={content.failedImports} />
      </Row>
      <Progress
        percent={funnelPercent(content.publishedQuestions, content.pendingCandidates)}
        status={content.failedImports > 0 ? 'exception' : 'normal'}
      />
    </Card>
  );
}

function TrainingMetrics({ dashboard }: { dashboard: PlatformDashboard }) {
  const { training } = dashboard;
  return (
    <Card className="admin-dense-card" title="训练业务">
      <Row gutter={[GUTTER, GUTTER]}>
        <Metric label="创建面试" value={training.interviews} />
        <Metric label="生成报告" value={training.reports} />
        <Metric label="练习提交" value={training.practiceSubmissions} />
        <Metric label="练习报告" value={training.practiceReports} />
      </Row>
    </Card>
  );
}

function RuntimeMetrics({ dashboard }: { dashboard: PlatformDashboard }) {
  const { runtime } = dashboard;
  return (
    <Card className="admin-dense-card" title="Agent 健康">
      <Row gutter={[GUTTER, GUTTER]}>
        <Metric label="运行次数" value={runtime.runs} />
        <Metric label="成功率" value={runtime.successRate} />
        <Metric label="Schema 通过率" value={runtime.schemaPassRate} />
        <Metric label="平均延迟 (ms)" value={Math.round(runtime.averageLatencyMs)} />
        <Metric label="降级次数" value={runtime.fallbacks} />
      </Row>
      <Progress
        percent={runtime.successRate}
        status={runtime.successRate < SUCCESS_RATE_HEALTHY ? 'active' : 'normal'}
      />
      <Typography.Title className="platform-analytics-subtitle" level={5}>
        最近异常运行
      </Typography.Title>
      {runtime.recentFailures.length ? (
        <Table
          columns={RUN_COLUMNS}
          dataSource={runtime.recentFailures}
          pagination={false}
          rowKey="id"
          size="small"
        />
      ) : (
        <Empty description="窗口内没有失败或降级运行" image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
    render: (value) => (value === null ? '—' : `${value} ms`),
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

function funnelPercent(published: number, pending: number): number {
  const total = published + pending;
  return total === 0 ? 0 : Number(((published / total) * PERCENT_SCALE).toFixed(1));
}
