import type { AiInvocationOperation } from '@interview-agent/contracts';

const OPERATION_LABELS: Record<AiInvocationOperation, string> = {
  model_connection_test: '连接测试',
  embedding: '向量检索',
  practice_evaluation: '单题评价',
  practice_report: '训练报告',
  interview_next: '模拟面试',
  admin_page_agent: '后台 Agent',
  user_page_agent: '用户端 Agent',
};

export const OPERATION_OPTIONS: { label: string; value: AiInvocationOperation | 'all' }[] = [
  { label: '全部调用', value: 'all' },
  ...Object.entries(OPERATION_LABELS).map(([value, label]) => ({
    label,
    value: value as AiInvocationOperation,
  })),
];

export function operationLabel(operation: AiInvocationOperation): string {
  return OPERATION_LABELS[operation];
}
