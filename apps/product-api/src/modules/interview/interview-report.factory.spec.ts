import type { InterviewSession } from '@interview-agent/contracts';
import { createInterviewReport } from './interview-report.factory';

function session(title: string): InterviewSession {
  return {
    id: 'interview-1',
    tenantId: 'tenant-a',
    userId: 'user-a',
    status: 'report_ready',
    stage: 'report_ready',
    version: 4,
    eventSequence: 8,
    workflowRunId: 'workflow-1',
    title,
    turns: [
      {
        id: 'turn-1',
        tenantId: 'tenant-a',
        sessionId: 'interview-1',
        commandId: 'command-1',
        role: 'candidate',
        stage: 'project_deep_dive',
        content: '我先明确问题和目标，再和相关同学协作推进，并通过指标验证结果。',
        traceId: 'trace-test-0001',
        createdAt: '2026-07-14T08:00:00.000Z',
      },
    ],
    createdAt: '2026-07-14T08:00:00.000Z',
    updatedAt: '2026-07-14T08:05:00.000Z',
  };
}

describe('createInterviewReport', () => {
  it.each(['后端开发工程师模拟面试', '产品经理模拟面试'])(
    '为 %s 生成岗位化报告而非 Agent 固定复盘',
    (title) => {
      const report = createInterviewReport({
        session: session(title),
        traceId: 'trace-test-0001',
        createdAt: '2026-07-14T08:10:00.000Z',
      });
      const serialized = JSON.stringify(report);

      expect(report.overall.summary).toContain(title.replace('模拟面试', ''));
      expect(serialized).not.toContain('Agent');
      expect(serialized).not.toContain('RAG');
      expect(serialized).not.toContain('Product API');
      expect(serialized).not.toContain('SSE');
    },
  );
});
