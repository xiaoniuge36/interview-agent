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
    <section id="section-1" className="card muted" aria-labelledby="pipeline-heading">
      <div className="eyebrow">Source Import</div>
      <h2 id="pipeline-heading">资料导入流水线</h2>
      <p>来源资产只进入后台治理域，经过处理、审核与发布后，才进入训练题库或检索索引。</p>
      {state.status === 'ready' ? (
        <ol className="pipeline" aria-label="资料导入各阶段数量">
          {state.data.importPipeline.map((step) => (
            <li className={'pipeline-step stage-' + step.stage} key={step.stage}>
              <strong>{step.count}</strong>
              <span>{PIPELINE_LABELS[step.stage]}</span>
            </li>
          ))}
        </ol>
      ) : (
        <SectionFeedback state={state} loadingMessage="正在加载导入流水线" />
      )}
    </section>
  );
}
