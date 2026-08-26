import {
  usePageAgentRunRecovery,
  type PageAgentRunLifecycle,
  type PageAgentRunRecoveryOptions,
} from '@interview-agent/page-agent-client';
import {
  completeAdminAgentRun,
  createAdminAgentRun,
  getAdminAgentRunHistory,
  heartbeatAdminAgentRun,
} from '@/lib/admin-page-agent-run-api';

export type AdminAgentRunLifecycle = Pick<PageAgentRunLifecycle, 'startRun' | 'completeRun'>;

const RECOVERY_OPTIONS: PageAgentRunRecoveryOptions = {
  api: {
    getRunHistory: getAdminAgentRunHistory,
    createRun: createAdminAgentRun,
    heartbeatRun: heartbeatAdminAgentRun,
    completeRun: completeAdminAgentRun,
  },
  messages: {
    historyUnavailable: '无法读取上次运行状态。',
    cancelledRunSummary: '对话已切换，任务未执行。',
  },
};

export function useAdminAgentRunRecovery(conversationId: string | null) {
  return usePageAgentRunRecovery(conversationId, RECOVERY_OPTIONS);
}
