import type { MasteryProfile, PracticeReport, PracticeSession } from '@interview-agent/contracts';
import Link from 'next/link';
import { PracticeReportPanel } from '../PracticeReportPanel';

type PracticeCompletionPanelProps = {
  session: PracticeSession;
  report: PracticeReport | null;
  mastery: MasteryProfile[];
  message: string;
  onRetry: () => void;
  onReviewItem: (itemId: string) => void;
  onStartNextRecommendation: () => void;
  startingNextRecommendation: boolean;
};

export function PracticeCompletionPanel(props: PracticeCompletionPanelProps) {
  const aiCompleted = props.session.status === 'report_ready';
  const hasReport = aiCompleted && props.report;
  return (
    <div className="practice-completion-page">
      <CompletionHeader aiCompleted={aiCompleted} {...props} />
      {hasReport ? <PracticeReportPanel report={props.report!} mastery={props.mastery} /> : null}
      <CompletedQuestionList session={props.session} onReviewItem={props.onReviewItem} />
      <ReportRetry aiCompleted={aiCompleted} report={props.report} onRetry={props.onRetry} />
      {props.message ? <p className="practice-completion-message">{props.message}</p> : null}
    </div>
  );
}

function CompletedQuestionList({
  session,
  onReviewItem,
}: {
  session: PracticeSession;
  onReviewItem: (itemId: string) => void;
}) {
  return (
    <section
      className="practice-completion-review-list"
      aria-labelledby="practice-completion-review-heading"
    >
      <div>
        <span>逐题回看</span>
        <h2 id="practice-completion-review-heading">回到每道题的回答与反馈</h2>
      </div>
      <div>
        {session.items.map((item) => (
          <button key={item.id} type="button" onClick={() => onReviewItem(item.id)}>
            <span>{item.sequence}</span>
            <strong>{item.question.title}</strong>
            <small>
              {item.evaluation ? `AI ${Math.round(item.evaluation.score)} 分` : '已保存回答'}
            </small>
          </button>
        ))}
      </div>
    </section>
  );
}

function CompletionHeader(props: PracticeCompletionPanelProps & { aiCompleted: boolean }) {
  return (
    <header>
      <span>{props.aiCompleted ? 'AI review complete' : 'Self-study complete'}</span>
      <h1>{props.aiCompleted ? '本轮 AI 复盘已生成' : '本轮自学已结束'}</h1>
      <p>{completionDescription(props.aiCompleted)}</p>
      <div>
        {props.aiCompleted ? <NextRecommendationButton {...props} /> : null}
        <Link href="/questions">开始新的题单</Link>
        <Link href="/home">返回题库大厅</Link>
      </div>
    </header>
  );
}

function NextRecommendationButton(props: PracticeCompletionPanelProps) {
  return (
    <button
      type="button"
      disabled={props.startingNextRecommendation}
      onClick={props.onStartNextRecommendation}
    >
      {props.startingNextRecommendation ? '正在准备下一轮…' : '按最新推荐开始下一轮'}
    </button>
  );
}

function ReportRetry({
  aiCompleted,
  report,
  onRetry,
}: {
  aiCompleted: boolean;
  report: PracticeReport | null;
  onRetry: () => void;
}) {
  if (!aiCompleted || report) return null;
  return (
    <div className="practice-report-retry" role="status">
      <p>正在重新读取报告内容，能力记录已经完成同步。</p>
      <button type="button" onClick={onRetry}>
        重新加载本轮复盘
      </button>
    </div>
  );
}

function completionDescription(aiCompleted: boolean) {
  return aiCompleted
    ? '逐题评价已汇总为能力记录，并会影响下一次 Agent 推荐。'
    : '本轮没有生成 AI 分数和 mastery 记录，你的回答仍已安全保留。';
}
