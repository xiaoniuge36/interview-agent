import type { CandidateReview, Dashboard } from '@interview-agent/contracts';
import { ConsoleIcon, type ConsoleIconName } from '@/components/ConsoleIcon';
import type { AdminView } from '@/components/admin-navigation';
import type { SectionState } from '@/hooks/useAdminDashboard';
import { DashboardStats } from './DashboardStats';

type AdminOverviewProps = {
  dashboard: SectionState<Dashboard>;
  candidates: SectionState<CandidateReview[]>;
  onNavigate: (view: AdminView) => void;
};

export function AdminOverview(props: AdminOverviewProps) {
  const dashboard = props.dashboard.status === 'ready' ? props.dashboard.data : null;
  const pending = pendingCandidates(props.candidates);
  return (
    <>
      <DashboardStats state={props.dashboard} />
      {dashboard ? (
        <div className="overview-layout">
          <GovernanceCommand dashboard={dashboard} pending={pending} onNavigate={props.onNavigate} />
          <RecentRuns dashboard={dashboard} onNavigate={props.onNavigate} />
        </div>
      ) : null}
    </>
  );
}

function GovernanceCommand(props: {
  dashboard: Dashboard;
  pending: number;
  onNavigate: (view: AdminView) => void;
}) {
  return (
    <section className="card command-card" aria-labelledby="command-heading">
      <div className="command-copy">
        <div className="eyebrow">Today&apos;s Operations</div>
        <h2 id="command-heading">今日治理待办</h2>
        <p>从需要人工处理的内容开始，完成后再检查运行质量与审计记录。</p>
      </div>
      <div className="command-metrics">
        <CommandMetric label="待审核候选题" value={props.pending} tone="warning" />
        <CommandMetric
          label="Schema 通过率"
          value={`${props.dashboard.stats.schemaPassRate}%`}
          tone="success"
        />
        <CommandMetric label="失败导入" value={failedImports(props.dashboard)} tone="danger" />
      </div>
      <div className="quick-actions" aria-label="快捷操作">
        <QuickAction icon="import" label="导入资料" onClick={() => props.onNavigate('imports')} />
        <QuickAction icon="review" label="审核候选题" onClick={() => props.onNavigate('questions')} />
        <QuickAction icon="activity" label="查看运行状态" onClick={() => props.onNavigate('runtime')} />
      </div>
    </section>
  );
}

function CommandMetric(props: {
  label: string;
  value: number | string;
  tone: 'danger' | 'success' | 'warning';
}) {
  return (
    <div className={`command-metric ${props.tone}`}>
      <strong>{props.value}</strong>
      <span>{props.label}</span>
    </div>
  );
}

function QuickAction(props: { icon: ConsoleIconName; label: string; onClick: () => void }) {
  return (
    <button className="quick-action" onClick={props.onClick} type="button">
      <ConsoleIcon name={props.icon} size={17} />
      <span>{props.label}</span>
      <strong aria-hidden="true">→</strong>
    </button>
  );
}

function RecentRuns(props: { dashboard: Dashboard; onNavigate: (view: AdminView) => void }) {
  return (
    <section className="card recent-runs-card" aria-labelledby="recent-runs-heading">
      <div className="card-title-row">
        <div>
          <div className="eyebrow">Latest Runtime</div>
          <h2 id="recent-runs-heading">最近 Agent 运行</h2>
        </div>
        <button className="button ghost compact-button" onClick={() => props.onNavigate('runtime')} type="button">
          查看全部
        </button>
      </div>
      {props.dashboard.recentRuns.length ? (
        <ul className="compact-run-list">
          {props.dashboard.recentRuns.map((run) => (
            <li key={run.id}>
              <span className={run.status === 'failed' ? 'status danger' : 'status'}>{run.stage}</span>
              <div>
                <strong>{runStatus(run.status)}</strong>
                <code>{run.traceId}</code>
              </div>
              <small>{run.latencyMs === null ? '暂无延迟' : `${run.latencyMs} ms`}</small>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state compact-empty">暂无 Agent 运行记录。</div>
      )}
    </section>
  );
}

function pendingCandidates(state: SectionState<CandidateReview[]>): number {
  return state.status === 'ready'
    ? state.data.filter((candidate) => candidate.status === 'pending').length
    : 0;
}

function failedImports(dashboard: Dashboard): number {
  return dashboard.importPipeline.find((item) => item.stage === 'failed')?.count ?? 0;
}

function runStatus(status: Dashboard['recentRuns'][number]['status']): string {
  return { running: '运行中', succeeded: '执行成功', failed: '执行失败', fallback: '已降级' }[
    status
  ];
}
