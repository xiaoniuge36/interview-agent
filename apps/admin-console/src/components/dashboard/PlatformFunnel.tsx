import { Alert, Card, Progress, Typography } from 'antd';
import type { PlatformAlert, PlatformDashboard } from '@interview-agent/contracts';
import React from 'react';
import { PlatformFunnelBar } from './PlatformBiCharts';
import { safePercent } from './platform-analytics-model';

const ALERT_COPY: Record<PlatformAlert['code'], { message: string; description: string }> = {
  review_backlog: {
    message: '候选题待审核',
    description: '请在审核工作台处理积压候选题。',
  },
  failed_imports: {
    message: '导入任务失败',
    description: '请检查导入记录并重试异常资料。',
  },
  runtime_risk: {
    message: 'Agent 运行需关注',
    description: '请查看右侧失败或降级记录。',
  },
};

export function PlatformFunnel({ dashboard }: { dashboard: PlatformDashboard }) {
  const { funnel } = dashboard;
  const publishRate = safePercent(
    funnel.publishedQuestions,
    funnel.publishedQuestions + funnel.pendingCandidates,
  );
  const reportRate = safePercent(funnel.practiceReports, funnel.practiceSubmissions);

  return (
    <Card className="admin-dense-card platform-bi-funnel-card" title="内容与训练链路">
      <div className="platform-bi-funnel-intro">
        <Typography.Text type="secondary">
          从窗口导入到练习报告，数值均基于当前筛选周期的真实数据。
        </Typography.Text>
      </div>
      <div className="platform-bi-chart-area">
        <PlatformFunnelBar funnel={funnel} />
      </div>
      <div className="platform-bi-rate-grid">
        <FunnelRate label="题目发布率" percent={publishRate} />
        <FunnelRate label="练习报告完成率" percent={reportRate} />
      </div>
      <AlertStack alerts={dashboard.alerts} />
    </Card>
  );
}

function FunnelRate({ label, percent }: { label: string; percent: number }) {
  return (
    <div className="platform-bi-rate-item">
      <div>
        <Typography.Text type="secondary">{label}</Typography.Text>
        <strong>{percent}%</strong>
      </div>
      <Progress percent={percent} showInfo={false} size="small" />
    </div>
  );
}

function AlertStack({ alerts }: { alerts: PlatformAlert[] }) {
  if (!alerts.length) {
    return <Alert showIcon title="当前没有需要处理的平台提醒。" type="success" />;
  }

  return (
    <div className="platform-alert-stack">
      {alerts.map((alert) => {
        const copy = ALERT_COPY[alert.code];
        return (
          <Alert
            description={copy.description}
            key={alert.code}
            title={copy.message + ' · ' + alert.count}
            showIcon
            type={alert.severity === 'critical' ? 'error' : 'warning'}
          />
        );
      })}
    </div>
  );
}
