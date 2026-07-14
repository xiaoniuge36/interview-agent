import type { Dashboard } from '@interview-agent/contracts';
import { ConsoleIcon, type ConsoleIconName } from '@/components/ConsoleIcon';
import type { SectionState } from '@/hooks/useAdminDashboard';
import { SectionFeedback } from './SectionState';

type StatKey = keyof Dashboard['stats'];
type StatDefinition = {
  key: StatKey;
  label: string;
  icon: ConsoleIconName;
  unit?: 'percentage' | 'milliseconds';
};

const STAT_DEFINITIONS: readonly StatDefinition[] = [
  { key: 'publishedQuestions', label: '已发布题目', icon: 'review' },
  { key: 'pendingCandidates', label: '待审核候选题', icon: 'workspace' },
  { key: 'activeInterviews', label: '活跃面试', icon: 'activity' },
  { key: 'reportsReady', label: '已生成报告', icon: 'document' },
  { key: 'schemaPassRate', label: 'Schema 通过率', icon: 'check', unit: 'percentage' },
  { key: 'avgLatencyMs', label: '平均延迟', icon: 'clock', unit: 'milliseconds' },
];

export function DashboardStats({ state }: { state: SectionState<Dashboard> }) {
  return (
    <section id="section-0" aria-labelledby="dashboard-heading">
      <div className="section-heading">
        <div>
          <div className="eyebrow">Governance Overview</div>
          <h2 id="dashboard-heading">治理总览</h2>
        </div>
        <p>关键资产、会话与 Agent 质量指标。</p>
      </div>
      {state.status === 'ready' ? (
        <div className="stats-grid">
          {STAT_DEFINITIONS.map((item) => (
            <article className="card stat" key={item.key}>
              <div className="stat-header">
                <span className="stat-icon">
                  <ConsoleIcon name={item.icon} size={16} />
                </span>
                <span>{item.label}</span>
              </div>
              <strong>{formatValue(state.data.stats[item.key], item.unit)}</strong>
            </article>
          ))}
        </div>
      ) : (
        <SectionFeedback state={state} loadingMessage="正在汇总治理指标" />
      )}
    </section>
  );
}

function formatValue(value: number, unit: StatDefinition['unit']): string {
  if (unit === 'percentage') return value + '%';
  if (unit === 'milliseconds') return Math.round(value) + ' ms';
  return String(value);
}
