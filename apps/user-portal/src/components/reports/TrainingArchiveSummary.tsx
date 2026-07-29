import { summarizeTrainingRecords } from './training-records-model';
import { WeaknessReviewAction } from './WeaknessReviewAction';

type TrainingSummary = ReturnType<typeof summarizeTrainingRecords>;

export function TrainingArchiveSummary({ summary }: { summary: TrainingSummary }) {
  return (
    <section className="training-archive-summary" aria-label="训练概览">
      <div>
        <span>训练证据</span>
        <strong>{summary.total} 条记录已沉淀</strong>
        <p>从真实的复盘出发，选择下一轮训练。</p>
        {summary.practice ? <WeaknessReviewAction /> : null}
      </div>
      <dl>
        <SummaryFact label="刷题" value={summary.practice} />
        <SummaryFact label="模拟面试" value={summary.interview} />
        <SummaryFact label="已完成复盘" value={summary.reviewed} />
      </dl>
    </section>
  );
}

function SummaryFact({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
