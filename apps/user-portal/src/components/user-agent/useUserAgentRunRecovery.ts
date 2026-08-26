import {
  usePageAgentRunRecovery,
  type PageAgentRunLifecycle,
  type PageAgentRunRecoveryOptions,
} from '@interview-agent/page-agent-client';
import {
  completeUserAgentRun,
  createUserAgentRun,
  getUserAgentRunHistory,
  heartbeatUserAgentRun,
} from '@/lib/user-page-agent-run-api';

export type UserAgentRunLifecycle = PageAgentRunLifecycle;

const RECOVERY_OPTIONS: PageAgentRunRecoveryOptions = {
  api: {
    getRunHistory: getUserAgentRunHistory,
    createRun: createUserAgentRun,
    heartbeatRun: heartbeatUserAgentRun,
    completeRun: completeUserAgentRun,
  },
  messages: {
    historyUnavailable: '无法读取上次训练运行状态。',
    cancelledRunSummary: '对话已切换，本次任务未执行。',
  },
};

export function useUserAgentRunRecovery(conversationId: string | null) {
  return usePageAgentRunRecovery(conversationId, RECOVERY_OPTIONS);
}
