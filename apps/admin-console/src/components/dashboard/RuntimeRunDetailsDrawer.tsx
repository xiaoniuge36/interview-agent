import type { AgentRunDetailView } from '@interview-agent/contracts';
import { Descriptions, Drawer, Empty, Space, Typography } from 'antd';
import React from 'react';
import {
  commandLabel,
  durationValue,
  providerLabel,
  qualitySummary,
  stageLabel,
  STATUS_LABELS,
  tokenValue,
} from './runtime-observability-format';

export function RuntimeRunDetailsDrawer({
  run,
  onClose,
}: {
  run: AgentRunDetailView | null;
  onClose: () => void;
}) {
  return (
    <Drawer destroyOnHidden open={Boolean(run)} size="large" title="运行详情" onClose={onClose}>
      {run ? <RunDescriptions run={run} /> : null}
    </Drawer>
  );
}

function RunDescriptions({ run }: { run: AgentRunDetailView }) {
  return (
    <Space orientation="vertical" size={20} style={{ width: '100%' }}>
      <Descriptions bordered column={1} size="small" title="运行信息">
        <Descriptions.Item label="用户">{run.user?.name ?? '未知用户'}</Descriptions.Item>
        <Descriptions.Item label="邮箱">{run.user?.email ?? '未登记'}</Descriptions.Item>
        <Descriptions.Item label="租户">{run.tenant.name}</Descriptions.Item>
        <Descriptions.Item label="面试任务">{run.sessionTitle ?? '未关联'}</Descriptions.Item>
        <Descriptions.Item label="阶段">{stageLabel(run.stage)}</Descriptions.Item>
        <Descriptions.Item label="命令">{commandLabel(run.command)}</Descriptions.Item>
        <Descriptions.Item label="状态">{STATUS_LABELS[run.status]}</Descriptions.Item>
        <Descriptions.Item label="质量与耗时">{qualitySummary(run)}</Descriptions.Item>
      </Descriptions>
      <ModelUsageDescriptions usage={run.modelUsage} />
      <Descriptions bordered column={1} size="small" title="追踪标识">
        <Descriptions.Item label="运行 ID">
          <CopyableCode value={run.id} />
        </Descriptions.Item>
        <Descriptions.Item label="会话 ID">
          <CopyableCode value={run.sessionId} />
        </Descriptions.Item>
        <Descriptions.Item label="Trace ID">
          <CopyableCode value={run.traceId} />
        </Descriptions.Item>
      </Descriptions>
    </Space>
  );
}

function ModelUsageDescriptions({ usage }: { usage: AgentRunDetailView['modelUsage'] }) {
  if (!usage) return <Empty description="历史运行未采集模型与 Token 信息" />;
  return (
    <Descriptions bordered column={1} size="small" title="模型消耗">
      <Descriptions.Item label="模型">{usage.model}</Descriptions.Item>
      <Descriptions.Item label="提供商">{providerLabel(usage.provider)}</Descriptions.Item>
      <Descriptions.Item label="调用次数">{usage.invocationCount}</Descriptions.Item>
      <Descriptions.Item label="输入 Token">{tokenValue(usage.inputTokens)}</Descriptions.Item>
      <Descriptions.Item label="输出 Token">{tokenValue(usage.outputTokens)}</Descriptions.Item>
      <Descriptions.Item label="缓存读取">{tokenValue(usage.cacheReadTokens)}</Descriptions.Item>
      <Descriptions.Item label="推理 Token">{tokenValue(usage.reasoningTokens)}</Descriptions.Item>
      <Descriptions.Item label="总 Token">{tokenValue(usage.totalTokens)}</Descriptions.Item>
      <Descriptions.Item label="模型耗时">{durationValue(usage.latencyMs)}</Descriptions.Item>
    </Descriptions>
  );
}

function CopyableCode({ value }: { value: string | null }) {
  if (!value) return <>—</>;
  return (
    <Typography.Text code copyable={{ text: value }}>
      {value}
    </Typography.Text>
  );
}
