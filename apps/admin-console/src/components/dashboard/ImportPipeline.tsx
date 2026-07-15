import { Card, Steps } from 'antd';
import type { Dashboard } from '@interview-agent/contracts';
import type { SectionState } from '@/hooks/useAdminDashboard';
import { SectionFeedback } from './SectionState';

type PipelineStage = Dashboard['importPipeline'][number]['stage'];

const PIPELINE_LABELS: Record<PipelineStage, string> = {
  received: '已接收',
  processing: '处理中',
  review: '待审核',
  published: '已发布',
  failed: '失败',
};

export function ImportPipeline({ state }: { state: SectionState<Dashboard> }) {
  return (
    <Card className="admin-dense-card" title="资料导入流水线">
      {state.status === 'ready' ? <PipelineSteps dashboard={state.data} /> : <SectionFeedback state={state} loadingMessage="正在加载导入流水线" />}
    </Card>
  );
}

function PipelineSteps({ dashboard }: { dashboard: Dashboard }) {
  return (
    <Steps
      responsive
      size="small"
      items={dashboard.importPipeline.map((step) => ({
        title: PIPELINE_LABELS[step.stage],
        description: `${step.count} 条`,
        status: step.stage === 'failed' ? 'error' : step.stage === 'published' ? 'finish' : 'process',
      }))}
    />
  );
}
