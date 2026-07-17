import { Badge, Card, Statistic, Tag, Typography } from 'antd';
import type { PlatformDashboard } from '@interview-agent/contracts';
import React from 'react';
import { platformHealth } from './platform-analytics-model';

export function PlatformHealthSummary({ dashboard }: { dashboard: PlatformDashboard }) {
  const health = platformHealth(dashboard.runtime);
  return (
    <Card className="platform-bi-overview-card">
      <div className="platform-bi-overview-heading">
        <div>
          <Typography.Text className="platform-bi-kicker">OPERATIONS OVERVIEW</Typography.Text>
          <Typography.Title level={3}>运营概览</Typography.Title>
          <Typography.Text type="secondary">内容供给、训练使用和 Agent 运行状态的实时汇总。</Typography.Text>
        </div>
        <Tag className={`platform-bi-health-tag platform-bi-health-${health.level}`}>{health.label}</Tag>
      </div>
      <div className="platform-bi-overview-content">
        <div className="platform-bi-health-status">
          <Badge status={badgeStatus(health.level)} text={health.description} />
          <Statistic suffix="%" title="Agent 成功率" value={dashboard.runtime.successRate} />
        </div>
        <div className="platform-bi-summary-metrics">
          <Metric label="账号总量" value={dashboard.accounts.total} />
          <Metric label="窗口新增" value={dashboard.accounts.created} />
          <Metric label="训练完成" value={dashboard.training.reports + dashboard.training.practiceReports} />
          <Metric label="平均延迟" suffix="ms" value={Math.round(dashboard.runtime.averageLatencyMs)} />
        </div>
      </div>
    </Card>
  );
}

function Metric({ label, suffix, value }: { label: string; suffix?: string; value: number }) {
  return <Statistic suffix={suffix} title={label} value={value} />;
}

function badgeStatus(level: ReturnType<typeof platformHealth>['level']) {
  if (level === 'healthy') return 'success';
  if (level === 'critical') return 'error';
  if (level === 'attention') return 'warning';
  return 'default';
}
