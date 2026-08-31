'use client';

import { Select } from 'antd';
import type { AiInvocationOperation, ModelProvider } from '@interview-agent/contracts';
import { OPERATION_OPTIONS } from './platform-ai-operations';

const PROVIDER_OPTIONS: { label: string; value: ModelProvider | 'all' }[] = [
  { label: '全部提供商', value: 'all' },
  { label: 'OpenAI', value: 'openai' },
  { label: 'Anthropic', value: 'anthropic' },
  { label: 'DeepSeek', value: 'deepseek' },
  { label: 'Qwen', value: 'qwen' },
  { label: '兼容端点', value: 'openai_compatible' },
];

export function PlatformAiAnalyticsFilters(props: {
  provider: ModelProvider | 'all';
  operation: AiInvocationOperation | 'all';
  onProviderChange: (value: ModelProvider | 'all') => void;
  onOperationChange: (value: AiInvocationOperation | 'all') => void;
}) {
  return (
    <div className="platform-ai-analytics-filters">
      <Select
        aria-label="提供商筛选"
        onChange={props.onProviderChange}
        options={PROVIDER_OPTIONS}
        value={props.provider}
      />
      <Select
        aria-label="调用类型筛选"
        onChange={props.onOperationChange}
        options={OPERATION_OPTIONS}
        value={props.operation}
      />
    </div>
  );
}
