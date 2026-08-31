'use client';

import { Card, Empty, Statistic, Table, Tag, Typography, type TableColumnsType } from 'antd';
import type {
  AiInvocationOperation,
  ModelProvider,
  PlatformAiAnalytics as PlatformAiAnalyticsData,
  PlatformDashboardPeriod,
} from '@interview-agent/contracts';
import React, { useCallback, useEffect, useState } from 'react';
import { AdminApiError } from '@/lib/api';
import { formatAdminDateTime } from '@/lib/format';
import { getPlatformAiAnalytics } from '@/lib/platform-api';
import { SectionFeedback } from './SectionState';
import { AiGuardrailStatus } from './AiGuardrailStatus';
import { AiQualityStatus } from './AiQualityStatus';
import { operationLabel } from './platform-ai-operations';
import { PlatformAiAnalyticsFilters } from './PlatformAiAnalyticsFilters';

const HTTP_FORBIDDEN = 403;

type AnalyticsState =
  | { status: 'loading' }
  | { status: 'ready'; data: PlatformAiAnalyticsData }
  | { status: 'forbidden'; access: 'platform-only' }
  | { status: 'error'; error: AdminApiError };

export function PlatformAiAnalytics({
  active,
  period,
  refreshKey,
}: {
  active: boolean;
  period: PlatformDashboardPeriod;
  refreshKey: number;
}) {
  const [provider, setProvider] = useState<ModelProvider | 'all'>('all');
  const [operation, setOperation] = useState<AiInvocationOperation | 'all'>('all');
  const { state, reload } = usePlatformAiAnalytics({
    active,
    period,
    provider,
    operation,
    refreshKey,
  });
  return (
    <section className="platform-ai-analytics" aria-labelledby="ai-analytics-heading">
      <div className="platform-ai-analytics-heading">
        <div>
          <Typography.Text className="platform-bi-kicker">BYOK 可观测性</Typography.Text>
          <Typography.Title id="ai-analytics-heading" level={3}>
            AI 调用洞察
          </Typography.Title>
          <Typography.Text type="secondary">
            基于真实模型调用的健康度，不记录用户的提示词、回答或模型正文。
          </Typography.Text>
        </div>
        <PlatformAiAnalyticsFilters
          provider={provider}
          operation={operation}
          onProviderChange={setProvider}
          onOperationChange={setOperation}
        />
      </div>
      {state.status === 'ready' ? <PlatformAiAnalyticsContent analytics={state.data} /> : null}
      {state.status !== 'ready' ? (
        <SectionFeedback state={state} loadingMessage="正在汇总真实模型调用…" onRetry={reload} />
      ) : null}
    </section>
  );
}

export function PlatformAiAnalyticsContent({ analytics }: { analytics: PlatformAiAnalyticsData }) {
  if (analytics.totals.invocations === 0) {
    return (
      <div className="platform-ai-analytics-content">
        <AiGuardrailStatus guardrails={analytics.guardrails} />
        <AiQualityStatus quality={analytics.quality} />
        <Card className="admin-dense-card platform-ai-empty-card">
          <Empty description="当前筛选下没有真实模型调用" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </Card>
      </div>
    );
  }
  return (
    <div className="platform-ai-analytics-content">
      <AiGuardrailStatus guardrails={analytics.guardrails} />
      <AiQualityStatus quality={analytics.quality} />
      <div className="platform-ai-overview">
        <Metric label="真实调用" value={analytics.totals.invocations} />
        <Metric label="成功率" suffix="%" value={analytics.totals.successRate} />
        <Metric label="平均延迟" suffix="ms" value={analytics.totals.averageLatencyMs} />
        <Metric
          label="返回 token"
          value={analytics.totals.totalTokens ?? 0}
          {...(analytics.totals.usageAvailable ? {} : { description: '供应商未提供' })}
        />
      </div>
      <div className="platform-ai-analytics-grid">
        <ModelBreakdown analytics={analytics} />
        <OperationBreakdown analytics={analytics} />
      </div>
      <RecentFailures analytics={analytics} />
    </div>
  );
}

function Metric({
  label,
  value,
  suffix,
  description,
}: {
  label: string;
  value: number;
  suffix?: string;
  description?: string;
}) {
  return (
    <Statistic
      suffix={suffix}
      title={description ? `${label} · ${description}` : label}
      value={value}
    />
  );
}

function ModelBreakdown({ analytics }: { analytics: PlatformAiAnalyticsData }) {
  return (
    <Card className="admin-dense-card platform-ai-models" title="提供商与模型">
      <Table
        columns={MODEL_COLUMNS}
        dataSource={analytics.byModel}
        pagination={false}
        rowKey={(row) => `${row.provider}:${row.model}`}
        size="small"
      />
    </Card>
  );
}

function OperationBreakdown({ analytics }: { analytics: PlatformAiAnalyticsData }) {
  return (
    <Card className="admin-dense-card platform-ai-operations" title="业务调用场景">
      <div className="platform-ai-operation-list">
        {analytics.byOperation.map((item) => (
          <div key={item.operation}>
            <span>{operationLabel(item.operation)}</span>
            <strong>{item.invocations}</strong>
            <small>
              {item.averageLatencyMs} ms · {item.succeeded} 成功
            </small>
          </div>
        ))}
      </div>
      <FailureCodes failures={analytics.failures} />
    </Card>
  );
}

function FailureCodes({ failures }: { failures: PlatformAiAnalyticsData['failures'] }) {
  if (!failures.length)
    return <Typography.Text type="secondary">当前没有模型调用失败。</Typography.Text>;
  return (
    <div className="platform-ai-failure-codes">
      <Typography.Text type="secondary">失败码</Typography.Text>
      {failures.map((item) => (
        <Tag key={item.errorCode}>
          {item.errorCode} · {item.count}
        </Tag>
      ))}
    </div>
  );
}

function RecentFailures({ analytics }: { analytics: PlatformAiAnalyticsData }) {
  return (
    <Card className="admin-dense-card platform-ai-failures" title="最近失败调用">
      {analytics.recentFailures.length ? (
        <Table
          columns={FAILURE_COLUMNS}
          dataSource={analytics.recentFailures}
          pagination={false}
          rowKey="id"
          size="small"
        />
      ) : (
        <Empty description="当前窗口没有失败调用" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </Card>
  );
}

const MODEL_COLUMNS: TableColumnsType<PlatformAiAnalyticsData['byModel'][number]> = [
  { title: '模型', dataIndex: 'model', ellipsis: true },
  { title: '提供商', dataIndex: 'provider' },
  { title: '调用', dataIndex: 'invocations', align: 'right' },
  { title: '成功', dataIndex: 'succeeded', align: 'right' },
];

const FAILURE_COLUMNS: TableColumnsType<PlatformAiAnalyticsData['recentFailures'][number]> = [
  { title: '场景', dataIndex: 'operation', render: operationLabel },
  { title: '模型', dataIndex: 'model', ellipsis: true },
  { title: '错误码', dataIndex: 'errorCode', render: (value) => value ?? '—' },
  {
    title: '耗时',
    dataIndex: 'latencyMs',
    render: (value) => (value === null ? '—' : `${value} ms`),
  },
  {
    title: '时间',
    dataIndex: 'createdAt',
    render: (value) => formatAdminDateTime(value),
  },
];

function usePlatformAiAnalytics(input: {
  active: boolean;
  period: PlatformDashboardPeriod;
  provider: ModelProvider | 'all';
  operation: AiInvocationOperation | 'all';
  refreshKey: number;
}): { state: AnalyticsState; reload: () => void } {
  const [state, setState] = useState<AnalyticsState>({ status: 'loading' });
  const [retryKey, setRetryKey] = useState(0);
  const reload = useCallback(() => setRetryKey((value) => value + 1), []);
  const { active, operation, period, provider, refreshKey } = input;
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    setState({ status: 'loading' });
    void getPlatformAiAnalytics(queryFor(period, provider, operation), controller.signal)
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
  }, [active, operation, period, provider, refreshKey, retryKey]);
  return { state, reload };
}

function queryFor(
  period: PlatformDashboardPeriod,
  provider: ModelProvider | 'all',
  operation: AiInvocationOperation | 'all',
) {
  return {
    period,
    ...(provider === 'all' ? {} : { provider }),
    ...(operation === 'all' ? {} : { operation }),
  };
}

function normalizeError(error: unknown): AdminApiError {
  return error instanceof AdminApiError
    ? error
    : new AdminApiError({
        message: error instanceof Error ? error.message : 'AI 调用洞察加载失败。',
        code: 'PLATFORM_AI_ANALYTICS_ERROR',
        cause: error,
      });
}
