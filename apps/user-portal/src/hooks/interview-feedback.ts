import type { InterviewSession, InterviewSessionStatus } from '@interview-agent/contracts';

const MILLISECONDS_PER_SECOND = 1_000;
const INTERNAL_ERROR_TERMS = /Product API|Agent Runtime|\bSSE\b|\bRuntime\b/iu;

export function interviewStatusNotice(status: InterviewSessionStatus): string {
  switch (status) {
    case 'created':
      return 'AI 面试官正在准备第一题，请稍候。';
    case 'running':
      return 'AI 面试官正在组织追问…';
    case 'waiting_user':
      return '轮到你作答。可按背景、目标、行动、结果组织回答。';
    case 'generating_report':
      return 'AI 面试官正在整理本轮复盘…';
    case 'report_ready':
      return '本轮复盘已生成，可查看得分和下一步建议。';
    case 'failed':
      return '本轮训练暂未完成，请稍后重新开始。';
    case 'cancelled':
      return '本轮训练已结束。';
  }
}

export function interviewStatusLabel(session: InterviewSession | null): string {
  if (!session) return '等待开始';
  return statusLabel(session.status);
}

export function interviewRetryNotice(retry: { attempt: number; delayMs: number }): string {
  const seconds = Math.max(1, Math.ceil(retry.delayMs / MILLISECONDS_PER_SECOND));
  return `连接短暂中断，正在自动恢复（第 ${retry.attempt} 次，约 ${seconds}s 后）。`;
}

export function interviewErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.trim() : '';
  if (!message || INTERNAL_ERROR_TERMS.test(message)) {
    return '训练服务暂时不可用，请稍后重试。';
  }
  return message;
}

function statusLabel(status: InterviewSessionStatus): string {
  return {
    created: '准备第一题',
    running: '正在组织追问',
    waiting_user: '等待你的回答',
    generating_report: '正在生成复盘',
    report_ready: '复盘已生成',
    failed: '本轮出现异常',
    cancelled: '本轮已结束',
  }[status];
}
