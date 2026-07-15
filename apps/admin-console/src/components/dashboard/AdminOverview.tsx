import {
  AuditOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  DatabaseOutlined,
  FileSearchOutlined,
  HddOutlined,
  RadarChartOutlined,
} from '@ant-design/icons';
import { Alert, Button, Card, Col, Row, Statistic, Table, Tag, Typography, type TableProps } from 'antd';
import type { CandidateReview, Dashboard } from '@interview-agent/contracts';
import type { AdminView } from '@/components/admin-navigation';
import type { SectionState } from '@/hooks/useAdminDashboard';
import { DashboardStats } from './DashboardStats';

const COMPACT_GUTTER = 12;

type AdminOverviewProps = {
  dashboard: SectionState<Dashboard>;
  candidates: SectionState<CandidateReview[]>;
  onNavigate: (view: AdminView) => void;
};

export function AdminOverview(props: AdminOverviewProps) {
  const dashboard = props.dashboard.status === 'ready' ? props.dashboard.data : null;
  const pending = pendingCandidates(props.candidates);
  return (
    <div className="admin-page">
      <AdminOpsBanner pending={pending} onNavigate={props.onNavigate} />
      <DashboardStats state={props.dashboard} />
      {dashboard ? <OverviewDetails dashboard={dashboard} pending={pending} onNavigate={props.onNavigate} /> : null}
    </div>
  );
}

function AdminOpsBanner(props: { pending: number; onNavigate: (view: AdminView) => void }) {
  const hasPending = props.pending > 0;
  return (
    <Alert
      showIcon
      action={
        <Button size="small" onClick={() => props.onNavigate(hasPending ? 'content' : 'runtime')}>
          {hasPending ? '进入审核' : '查看运行'}
        </Button>
      }
      icon={<CheckCircleOutlined />}
      message={hasPending ? `有 ${props.pending} 道候选题待审核` : '治理队列健康'}
      description={hasPending ? '建议优先完成内容审核，再检查模型和运行状态。' : '当前没有待审核候选题。'}
      type={hasPending ? 'warning' : 'success'}
    />
  );
}

function OverviewDetails(props: { dashboard: Dashboard; pending: number; onNavigate: (view: AdminView) => void }) {
  return (
    <Row gutter={[COMPACT_GUTTER, COMPACT_GUTTER]}>
      <Col lg={16} xs={24}>
        <GovernanceCommand {...props} />
      </Col>
      <Col lg={8} xs={24}>
        <RecentRuns dashboard={props.dashboard} onNavigate={props.onNavigate} />
      </Col>
      <Col span={24}>
        <AdminCapabilityGrid onNavigate={props.onNavigate} />
      </Col>
    </Row>
  );
}

function GovernanceCommand(props: { dashboard: Dashboard; pending: number; onNavigate: (view: AdminView) => void }) {
  return (
    <Card className="admin-dense-card" title="今日治理待办">
      <Row gutter={[COMPACT_GUTTER, COMPACT_GUTTER]}>
        <Col sm={8} xs={24}><Statistic title="待审核候选题" value={props.pending} /></Col>
        <Col sm={8} xs={24}><Statistic suffix="%" title="Schema 通过率" value={props.dashboard.stats.schemaPassRate} /></Col>
        <Col sm={8} xs={24}><Statistic title="失败导入" value={failedImports(props.dashboard)} /></Col>
      </Row>
      <div className="admin-quick-actions">
        <Button icon={<CloudUploadOutlined />} onClick={() => props.onNavigate('imports')}>导入资料</Button>
        <Button icon={<FileSearchOutlined />} type="primary" onClick={() => props.onNavigate('content')}>审核候选题</Button>
        <Button icon={<RadarChartOutlined />} onClick={() => props.onNavigate('runtime')}>运行观测</Button>
      </div>
    </Card>
  );
}

function RecentRuns({ dashboard, onNavigate }: { dashboard: Dashboard; onNavigate: (view: AdminView) => void }) {
  const columns: TableProps<Dashboard['recentRuns'][number]>['columns'] = [
    { title: '阶段', dataIndex: 'stage', ellipsis: true },
    { title: '状态', dataIndex: 'status', width: 96, render: (status) => <Tag color={runColor(status)}>{runStatus(status)}</Tag> },
    { title: '耗时', dataIndex: 'latencyMs', width: 80, render: (value) => (value === null ? '—' : `${value} ms`) },
  ];
  return (
    <Card
      className="admin-dense-card admin-overview-runs"
      extra={<Button type="link" onClick={() => onNavigate('runtime')}>全部运行</Button>}
      title="最近 Agent 运行"
    >
      {dashboard.recentRuns.length ? <Table columns={columns} dataSource={dashboard.recentRuns} pagination={false} rowKey="id" size="small" /> : <Typography.Text type="secondary">暂无 Agent 运行记录。</Typography.Text>}
    </Card>
  );
}

function AdminCapabilityGrid({ onNavigate }: { onNavigate: (view: AdminView) => void }) {
  const items = [
    { view: 'imports' as const, label: '资料导入', icon: <CloudUploadOutlined /> },
    { view: 'questions' as const, label: '题库管理', icon: <DatabaseOutlined /> },
    { view: 'content' as const, label: '审核工作台', icon: <FileSearchOutlined /> },
    { view: 'models' as const, label: '模型治理', icon: <HddOutlined /> },
    { view: 'runtime' as const, label: '运行观测', icon: <RadarChartOutlined /> },
    { view: 'audit' as const, label: '审计日志', icon: <AuditOutlined /> },
  ];
  return (
    <Card className="admin-dense-card" title="管理模块">
      <div className="admin-module-actions">
        {items.map((item) => <Button icon={item.icon} key={item.view} onClick={() => onNavigate(item.view)}>{item.label}</Button>)}
      </div>
    </Card>
  );
}

function pendingCandidates(state: SectionState<CandidateReview[]>): number {
  return state.status === 'ready' ? state.data.filter((candidate) => candidate.status === 'pending').length : 0;
}

function failedImports(dashboard: Dashboard): number {
  return dashboard.importPipeline.find((item) => item.stage === 'failed')?.count ?? 0;
}

function runStatus(status: Dashboard['recentRuns'][number]['status']): string {
  return { running: '运行中', succeeded: '成功', failed: '失败', fallback: '已降级' }[status];
}

function runColor(status: Dashboard['recentRuns'][number]['status']): string {
  return { running: 'processing', succeeded: 'success', failed: 'error', fallback: 'warning' }[status];
}
