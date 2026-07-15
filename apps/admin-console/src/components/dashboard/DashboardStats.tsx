import { Card, Col, Row, Statistic } from 'antd';
import type { Dashboard } from '@interview-agent/contracts';
import type { SectionState } from '@/hooks/useAdminDashboard';
import { SectionFeedback } from './SectionState';

const COMPACT_GUTTER = 12;

type StatKey = keyof Dashboard['stats'];
type StatDefinition = {
  key: StatKey;
  label: string;
  suffix?: '%' | 'ms';
};

const STAT_DEFINITIONS: readonly StatDefinition[] = [
  { key: 'publishedQuestions', label: '已发布题目' },
  { key: 'pendingCandidates', label: '待审核候选题' },
  { key: 'activeInterviews', label: '活跃面试' },
  { key: 'reportsReady', label: '已生成报告' },
  { key: 'schemaPassRate', label: 'Schema 通过率', suffix: '%' },
  { key: 'avgLatencyMs', label: '平均延迟', suffix: 'ms' },
];

export function DashboardStats({ state }: { state: SectionState<Dashboard> }) {
  if (state.status !== 'ready') return <SectionFeedback state={state} loadingMessage="正在汇总治理指标" />;
  return (
    <section aria-label="治理指标">
      <Row gutter={[COMPACT_GUTTER, COMPACT_GUTTER]}>
        {STAT_DEFINITIONS.map((item) => (
          <Col key={item.key} lg={4} sm={8} xs={12}>
            <Card className="admin-dense-card" size="small">
              <Statistic suffix={item.suffix} title={item.label} value={statValue(state.data.stats[item.key], item.suffix)} />
            </Card>
          </Col>
        ))}
      </Row>
    </section>
  );
}

function statValue(value: number, suffix: StatDefinition['suffix']): number {
  return suffix === 'ms' ? Math.round(value) : value;
}
