import { Card, Statistic, Tag, Typography } from 'antd';
import type { PlatformDashboard } from '@interview-agent/contracts';
import React from 'react';

const AGENT_PRESENTATION = {
  interview: { label: '模拟面试 Agent', description: '推进模拟面试的下一轮提问' },
  practice_evaluation: { label: '练习评估 Agent', description: '评价练习作答并生成反馈' },
  user_assistant: { label: '用户助手 Agent', description: '协助用户完成训练相关任务' },
  admin_assistant: { label: '管理员助手 Agent', description: '协助运营人员处理后台任务' },
} as const;

const STABLE_SUCCESS_RATE = 95;
const ATTENTION_SUCCESS_RATE = 80;

export function PlatformUsageInsights({ dashboard }: { dashboard: PlatformDashboard }) {
  const { userUsage } = dashboard;
  return (
    <div className="platform-usage-grid">
      <Card className="admin-dense-card platform-user-usage-card" title="用户使用情况">
        <Typography.Text type="secondary">
          聚焦普通用户在当前统计窗口内的训练参与度。
        </Typography.Text>
        <div className="platform-user-usage-metrics">
          <Metric label="活跃用户" value={userUsage.activeUsers} />
          <Metric label="模拟面试" value={userUsage.interviews} />
          <Metric label="练习提交" value={userUsage.practiceSubmissions} />
          <Metric label="报告产出" value={userUsage.reports} />
        </div>
        <div className="platform-user-usage-flow" aria-label="用户参与链路">
          <span>活跃用户</span>
          <span aria-hidden="true">→</span>
          <span>模拟面试</span>
          <span aria-hidden="true">→</span>
          <span>练习与报告</span>
        </div>
      </Card>
      <Card className="admin-dense-card platform-agent-usage-card" title="Agent 使用情况">
        <div className="platform-agent-usage-list">
          {dashboard.agentUsage.map((item) => {
            const presentation = AGENT_PRESENTATION[item.agent];
            return (
              <article className="platform-agent-usage-item" key={item.agent}>
                <div className="platform-agent-usage-heading">
                  <div>
                    <strong>{presentation.label}</strong>
                    <Typography.Text type="secondary">{presentation.description}</Typography.Text>
                  </div>
                  <Tag color={successTone(item.runs, item.successRate)}>
                    {successLabel(item.runs, item.successRate)}
                  </Tag>
                </div>
                <div className="platform-agent-usage-metrics">
                  <Metric label="调用" value={item.runs} />
                  <Metric label="成功" value={item.succeeded} />
                  <Metric label="成功率" suffix="%" value={item.successRate} />
                </div>
              </article>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, suffix, value }: { label: string; suffix?: string; value: number }) {
  return <Statistic suffix={suffix} title={label} value={value} />;
}

function successTone(runs: number, successRate: number) {
  if (runs === 0) return 'default';
  if (successRate >= STABLE_SUCCESS_RATE) return 'success';
  if (successRate >= ATTENTION_SUCCESS_RATE) return 'warning';
  return 'error';
}

function successLabel(runs: number, successRate: number) {
  if (runs === 0) return '暂无调用';
  if (successRate >= STABLE_SUCCESS_RATE) return '稳定';
  if (successRate >= ATTENTION_SUCCESS_RATE) return '需关注';
  return '需处理';
}
