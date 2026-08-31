import { Card, Statistic } from 'antd';
import type { PlatformAiAnalytics } from '@interview-agent/contracts';
import React from 'react';

export function AiQualityStatus({ quality }: { quality: PlatformAiAnalytics['quality'] }) {
  return (
    <Card className="admin-dense-card platform-ai-quality" title="模型链路质量">
      <div className="platform-ai-overview">
        <Statistic suffix="%" title="向量覆盖率" value={quality.embeddingCoverage} />
        <Statistic suffix="ms" title="检索延迟" value={quality.retrievalLatencyMs} />
        <Statistic title="死信任务" value={quality.deadLetterJobs} />
        <Statistic suffix="%" title="结构校验通过率" value={quality.schemaPassRate} />
        <Statistic suffix="%" title="降级率" value={quality.fallbackRate} />
        <Statistic title="预算拒绝" value={quality.budgetRejected} />
      </div>
    </Card>
  );
}
