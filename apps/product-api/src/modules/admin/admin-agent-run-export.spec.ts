import type { AgentRunDetailView } from '@interview-agent/contracts';
import { renderAgentRunExportCsv } from './admin-export-csv';

describe('Agent run CSV export', () => {
  it('includes ownership, model, and token consumption', () => {
    const result = renderAgentRunExportCsv([agentRunDetail()]);

    expect(result).toContain('用户,邮箱,租户,面试任务,模型提供商,模型');
    expect(result).toContain('输入 Token,输出 Token,缓存读取 Token,推理 Token,总 Token');
    expect(result).toContain(
      'Niu,niu@example.com,Niu 的个人空间,全栈开发工程师面试训练,openai_compatible,zai-org/GLM-5.2',
    );
    expect(result).toContain(',900,334,120,80,1234,');
  });
});

function agentRunDetail(): AgentRunDetailView {
  return {
    id: 'run-1',
    sessionId: 'session-1',
    type: 'mock_interview',
    status: 'succeeded',
    stage: 'tech_basics',
    traceId: 'trace-12345678',
    latencyMs: 9126,
    schemaValid: true,
    fallbackUsed: false,
    attemptCount: 1,
    updatedAt: '2026-07-17T07:31:04.321Z',
    tenant: { id: 'tenant-1', name: 'Niu 的个人空间' },
    user: { id: 'user-1', name: 'Niu', email: 'niu@example.com' },
    sessionTitle: '全栈开发工程师面试训练',
    command: 'answer',
    modelUsage: {
      provider: 'openai_compatible',
      model: 'zai-org/GLM-5.2',
      invocationCount: 1,
      inputTokens: 900,
      outputTokens: 334,
      cacheReadTokens: 120,
      reasoningTokens: 80,
      totalTokens: 1234,
      latencyMs: 8400,
    },
  };
}
