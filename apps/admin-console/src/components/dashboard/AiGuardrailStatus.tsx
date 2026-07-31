import { Card, Statistic } from 'antd';
import type { PlatformAiAnalytics } from '@interview-agent/contracts';
import React from 'react';

export function AiGuardrailStatus({
  guardrails,
}: {
  guardrails: PlatformAiAnalytics['guardrails'];
}) {
  return (
    <Card className="admin-dense-card platform-ai-guardrails" title="预算与熔断保护">
      <div className="platform-ai-overview">
        <Statistic title="预算拒绝" value={guardrails.budgetRejected} />
        <Statistic title="熔断拒绝" value={guardrails.circuitRejected} />
        <Statistic title="打开熔断" value={guardrails.openCircuits} />
        <Statistic title="半开探测" value={guardrails.halfOpenCircuits} />
      </div>
    </Card>
  );
}
