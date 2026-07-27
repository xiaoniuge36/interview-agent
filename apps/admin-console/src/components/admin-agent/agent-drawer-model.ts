import type { AgentStatus } from '@page-agent/core';
import type { AdminAgentRun } from '@/lib/admin-page-agent-run-api';
import type { PageAgentExecutionStep } from './admin-agent-runtime';
import type { AgentMessage } from './useAdminAgentConversation';

export type AgentErrorPresentation = {
  title: string;
  description: string;
  retryLabel: string;
  type: 'error' | 'warning';
};

const ABORTED_TASK_PATTERN = /(?:task\s+aborted|aborterror|任务已中止|任务已取消)/i;

export function resolveAgentErrorPresentation(content: string): AgentErrorPresentation {
  if (ABORTED_TASK_PATTERN.test(content)) {
    return {
      title: '任务已中止',
      description: '本次任务已停止，已完成的对话仍然保留。',
      retryLabel: '重新执行',
      type: 'warning',
    };
  }
  return {
    title: '任务执行失败',
    description: content.trim() || '执行过程中发生未知错误，请稍后重试。',
    retryLabel: '重试上一步',
    type: 'error',
  };
}

export function retryPromptBefore(messages: readonly AgentMessage[], errorIndex: number) {
  for (let index = errorIndex - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === 'user') return message.content;
  }
  return null;
}

export function shouldExpandAgentContext(messages: readonly AgentMessage[], status: AgentStatus) {
  return messages.length === 0 || status === 'running' || status === 'error';
}

export function executionTraceSummary(steps: readonly PageAgentExecutionStep[]) {
  const latest = steps.at(-1);
  return latest ? { label: latest.label, state: latest.state } : null;
}

export function resolveInterruptedRunPresentation(run: AdminAgentRun | null) {
  if (run?.status !== 'interrupted') return null;
  const step = run.currentStep || '尚未记录执行步骤';
  return {
    title: '上次任务已中断',
    description: `上次执行停在“${step}”。系统不会自动续跑旧步骤；重试会创建一次新的运行。`,
    prompt: run.prompt,
    retryLabel: '安全重试',
  };
}
