import type { UserAgentRun } from '@/lib/user-page-agent-run-api';

const RETRYABLE_STATUSES = ['failed', 'cancelled', 'interrupted'] as const;
const ACTIVE_STATUSES = ['running', 'waiting_confirmation'] as const;

export function UserAgentRunHistory(props: {
  latestRun: UserAgentRun | null;
  runs: UserAgentRun[];
  onRetry: (prompt: string, retryOfRunId: string) => void;
}) {
  if (!props.latestRun || isActive(props.latestRun.status)) return null;
  return (
    <section aria-label="训练运行恢复" className="user-agent-run-recovery">
      <RunRecoveryCard run={props.latestRun} onRetry={props.onRetry} />
      <RunHistoryList runs={props.runs} />
    </section>
  );
}

function RunRecoveryCard(props: {
  run: UserAgentRun;
  onRetry: (prompt: string, retryOfRunId: string) => void;
}) {
  if (!isRetryable(props.run.status)) return null;
  return (
    <div className="user-agent-run-recovery-card">
      <div>
        <strong>{recoveryTitle(props.run.status)}</strong>
        <p>{props.run.errorSummary ?? props.run.currentStep ?? '本次训练建议未能完整保存。'}</p>
      </div>
      <button type="button" onClick={() => props.onRetry(props.run.prompt, props.run.id)}>
        安全重试
      </button>
    </div>
  );
}

function RunHistoryList({ runs }: { runs: UserAgentRun[] }) {
  if (!runs.length) return null;
  return (
    <details className="user-agent-run-history">
      <summary>运行历史 · {runs.length} 条</summary>
      <ol>
        {runs.map((run) => (
          <li key={run.id}>
            <span className={`is-${run.status}`}>{statusLabel(run.status)}</span>
            <small>{run.currentStep ?? run.errorSummary ?? '未记录执行步骤'}</small>
            {run.retryOfRunId ? <em>重试任务</em> : null}
          </li>
        ))}
      </ol>
    </details>
  );
}

function isActive(status: UserAgentRun['status']) {
  return ACTIVE_STATUSES.includes(status as (typeof ACTIVE_STATUSES)[number]);
}

function isRetryable(status: UserAgentRun['status']) {
  return RETRYABLE_STATUSES.includes(status as (typeof RETRYABLE_STATUSES)[number]);
}

function recoveryTitle(status: UserAgentRun['status']) {
  return (
    {
      running: '训练建议正在运行',
      waiting_confirmation: '训练建议等待确认',
      succeeded: '训练建议已完成',
      failed: '上次训练建议执行失败',
      cancelled: '上次训练建议已取消',
      interrupted: '上次训练建议已中断',
    }[status] ?? '上次训练建议需要恢复'
  );
}

function statusLabel(status: UserAgentRun['status']) {
  return {
    running: '运行中',
    waiting_confirmation: '等待确认',
    succeeded: '已完成',
    failed: '执行失败',
    cancelled: '已取消',
    interrupted: '已中断',
  }[status];
}
