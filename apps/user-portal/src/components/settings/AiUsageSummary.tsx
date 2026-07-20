'use client';

import React, { useEffect, useState } from 'react';
import type {
  AiUsagePeriod,
  AiUsageSummary as AiUsageSummaryData,
} from '@interview-agent/contracts';
import { getAiUsageSummary } from '../../lib/ai-usage-api';

const PERIODS: { value: AiUsagePeriod; label: string }[] = [
  { value: 'today', label: '今日' },
  { value: '7d', label: '近 7 天' },
  { value: '30d', label: '近 30 天' },
];

type UsageState =
  | { status: 'loading' }
  | { status: 'ready'; summary: AiUsageSummaryData }
  | { status: 'error'; message: string };

export function AiUsageSummary() {
  const [period, setPeriod] = useState<AiUsagePeriod>('7d');
  const state = useAiUsageSummary(period);
  return (
    <section className="settings-section ai-usage-summary" aria-labelledby="ai-usage-heading">
      <header className="ai-usage-heading">
        <div>
          <span className="ai-usage-kicker">PRIVATE MODEL ACTIVITY</span>
          <h2 id="ai-usage-heading" className="h2">
            我的 AI 使用情况
          </h2>
          <p>仅统计你的模型连接产生的调用，不保存提示词、回答或模型正文。</p>
        </div>
        <div className="ai-usage-periods" aria-label="用量统计时间范围">
          {PERIODS.map((item) => (
            <button
              aria-pressed={period === item.value}
              className={period === item.value ? 'active' : ''}
              key={item.value}
              onClick={() => setPeriod(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>
      <AiUsageSummaryBody state={state} />
    </section>
  );
}

export function AiUsageSummaryContent({ summary }: { summary: AiUsageSummaryData }) {
  if (summary.totals.invocations === 0) {
    return (
      <div className="ai-usage-empty">
        <strong>还没有 AI 调用记录</strong>
        <p>连接测试、单题评价或模拟面试调用你的默认模型后，这里会显示健康度与最近状态。</p>
      </div>
    );
  }
  return (
    <div className="ai-usage-content">
      <div className="ai-usage-metrics">
        <Metric label="调用次数" value={formatNumber(summary.totals.invocations)} />
        <Metric label="成功率" value={`${summary.totals.successRate}%`} />
        <Metric label="平均耗时" value={`${summary.totals.averageLatencyMs} ms`} />
        <Metric
          label="返回 token"
          value={
            summary.totals.totalTokens === null
              ? '未提供'
              : formatNumber(summary.totals.totalTokens)
          }
        />
      </div>
      {!summary.totals.usageAvailable ? (
        <p className="ai-usage-note">
          你的供应商尚未返回 token 用量，调用统计与健康度仍会正常记录。
        </p>
      ) : null}
      <div className="ai-usage-details">
        <UsageModels summary={summary} />
        <RecentInvocations summary={summary} />
      </div>
    </div>
  );
}

function AiUsageSummaryBody({ state }: { state: UsageState }) {
  if (state.status === 'loading') return <p className="ai-usage-state">正在汇总你的模型调用…</p>;
  if (state.status === 'error') return <p className="settings-error">{state.message}</p>;
  return <AiUsageSummaryContent summary={state.summary} />;
}

function UsageModels({ summary }: { summary: AiUsageSummaryData }) {
  return (
    <div className="ai-usage-models">
      <h3>模型分布</h3>
      <ul>
        {summary.byModel.map((item) => (
          <li key={`${item.provider}:${item.model}`}>
            <span>{item.model}</span>
            <span>{item.provider}</span>
            <strong>{item.invocations} 次</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecentInvocations({ summary }: { summary: AiUsageSummaryData }) {
  return (
    <div className="ai-usage-recent">
      <h3>最近调用</h3>
      <ul>
        {summary.recent.map((item) => (
          <li key={item.id}>
            <div>
              <strong>{operationLabel(item.operation)}</strong>
              <span>{item.model}</span>
            </div>
            <span className={`ai-usage-status ${item.status}`}>{statusLabel(item.status)}</span>
            <time dateTime={item.createdAt}>
              {new Date(item.createdAt).toLocaleString('zh-CN')}
            </time>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function useAiUsageSummary(period: AiUsagePeriod): UsageState {
  const [state, setState] = useState<UsageState>({ status: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    void getAiUsageSummary(period, controller.signal)
      .then((summary) => setState({ status: 'ready', summary }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', message: messageOf(error) });
      });
    return () => controller.abort();
  }, [period]);
  return state;
}

function operationLabel(operation: AiUsageSummaryData['recent'][number]['operation']): string {
  if (operation === 'model_connection_test') return '连接测试';
  if (operation === 'practice_evaluation') return '单题评价';
  return '模拟面试';
}

function statusLabel(status: AiUsageSummaryData['recent'][number]['status']): string {
  if (status === 'succeeded') return '成功';
  if (status === 'cancelled') return '已取消';
  return '失败';
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : '暂时无法读取 AI 使用情况，请稍后重试。';
}
