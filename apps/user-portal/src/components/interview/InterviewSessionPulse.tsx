import type { AiOperationPhase, InterviewSession } from '@interview-agent/contracts';
import { formatClockTime } from '@/lib/format';
import { interviewSessionProgress } from './interview-state';
import { interviewStageLabel } from './interview-labels';

type InterviewSessionPulseProps = {
  session: InterviewSession | null;
  phase: AiOperationPhase | null;
  statusLabel: string;
};

const PHASE_LABELS: Record<AiOperationPhase, string> = {
  preparing: 'AI 正在准备本轮问题',
  analyzing: 'AI 正在分析你的回答',
  composing: 'AI 正在组织下一题',
  validating: 'AI 正在核对结果',
  saving: 'AI 正在保存本轮结果',
};

export function InterviewSessionPulse({ session, phase, statusLabel }: InterviewSessionPulseProps) {
  const progress = interviewSessionProgress(session);
  return (
    <section className="interview-session-pulse" aria-label="本轮面试状态">
      <span>{pulseSummary(progress.answered, session)}</span>
      <strong>{progress.stage ? interviewStageLabel(progress.stage) : '准备开始'}</strong>
      <small>{phase ? PHASE_LABELS[phase] : statusLabel}</small>
      {session?.status === 'report_ready' ? (
        <a className="interview-session-report-link" href="#interview-report">
          直接查看本轮复盘
        </a>
      ) : null}
    </section>
  );
}

/* 会话没有独立的 startedAt 字段，createdAt 即本轮开始时刻。 */
function pulseSummary(answered: number, session: InterviewSession | null): string {
  const base = `已回答 ${answered} 题`;
  return session ? `${base} · ${formatClockTime(session.createdAt)} 开始` : base;
}
