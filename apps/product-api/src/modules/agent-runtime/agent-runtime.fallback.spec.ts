import type { AgentRuntimeSessionContext } from '@interview-agent/contracts';
import { localFallback } from './agent-runtime.fallback';

function session(title: string): AgentRuntimeSessionContext {
  return {
    id: 'interview-1',
    tenantId: 'tenant-a',
    userId: 'user-a',
    status: 'created',
    stage: 'warmup',
    version: 0,
    title,
    candidateTurnCount: 0,
    recentTurns: [],
  };
}

describe('localFallback', () => {
  it('根据研发岗位生成系统设计追问', () => {
    const decision = localFallback(session('后端开发工程师模拟面试'), '这是我的回答');

    expect(decision.content).toContain('后端开发工程师');
    expect(decision.content).toContain('系统边界');
    expect(decision.content).not.toContain('Product API');
  });

  it('根据产品岗位生成用户与指标追问', () => {
    const decision = localFallback(session('产品经理模拟面试'), '这是我的回答');

    expect(decision.content).toContain('用户问题');
    expect(decision.content).toContain('上线效果');
  });

  it('根据商业交付岗位生成客户价值追问', () => {
    const decision = localFallback(session('客户成功经理模拟面试'), '这是我的回答');

    expect(decision.content).toContain('客户目标');
    expect(decision.content).toContain('交付风险');
  });
});
