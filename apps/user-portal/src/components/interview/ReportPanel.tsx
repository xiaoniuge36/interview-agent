import type { InterviewReport, InterviewSessionStatus } from '@interview-agent/contracts';
import { interviewStageLabel } from './interview-labels';
import { InterviewReviewPracticeAction } from './InterviewReviewPracticeAction';

type ReportPanelProps = {
  report: InterviewReport | null;
  sessionStatus?: InterviewSessionStatus | null;
  onRetry?: (() => void) | undefined;
  retrying?: boolean;
  sessionId?: string | undefined;
  onStartInterviewReview?: ((sessionId: string) => void) | undefined;
  reviewStarting?: boolean;
};

export function ReportPanel({
  report,
  sessionStatus = null,
  onRetry,
  retrying = false,
  sessionId,
  onStartInterviewReview,
  reviewStarting = false,
}: ReportPanelProps) {
  return (
    <section className="panel report-card stack compact">
      <div className="eyebrow">本轮复盘</div>
      {report ? (
        <ReportContent
          report={report}
          sessionId={sessionId}
          onStartInterviewReview={onStartInterviewReview}
          reviewStarting={reviewStarting}
        />
      ) : (
        <ReportPlaceholder status={sessionStatus} onRetry={onRetry} retrying={retrying} />
      )}
    </section>
  );
}

function ReportContent(props: {
  report: InterviewReport;
  sessionId?: string | undefined;
  onStartInterviewReview?: ((sessionId: string) => void) | undefined;
  reviewStarting: boolean;
}) {
  const { report } = props;
  return (
    <>
      <div className="score-hero" aria-label={'总分 ' + report.overall.score}>
        {report.overall.score}
      </div>
      <p className="muted-text">{report.overall.summary}</p>
      <div className="score-list">
        {report.stageScores.map((item) => (
          <div className="score-row" key={item.stage}>
            <span>{interviewStageLabel(item.stage)}</span>
            <strong>{item.score}</strong>
          </div>
        ))}
      </div>
      {report.nextActions.length ? (
        <section className="report-next-actions" aria-labelledby="report-next-actions-heading">
          <h3 id="report-next-actions-heading">下一步建议</h3>
          <div className="stack compact">
            {report.nextActions.map((item) => (
              <span className="chip" key={item}>
                {item}
              </span>
            ))}
          </div>
        </section>
      ) : null}
      {props.sessionId && props.onStartInterviewReview ? (
        <InterviewReviewPracticeAction
          report={report}
          sessionId={props.sessionId}
          starting={props.reviewStarting}
          onStart={props.onStartInterviewReview}
        />
      ) : null}
    </>
  );
}

function ReportPlaceholder({
  status,
  onRetry,
  retrying,
}: {
  status: InterviewSessionStatus | null;
  onRetry?: (() => void) | undefined;
  retrying: boolean;
}) {
  if (status === 'report_ready') {
    return (
      <div className="stack compact" role="status">
        <p className="muted-text">
          AI 复盘已生成，报告内容暂时无法读取。{onRetry ? '可在此重新加载。' : '刷新页面可重试。'}
        </p>
        {onRetry ? (
          <button className="button secondary" type="button" disabled={retrying} onClick={onRetry}>
            {retrying ? '正在重新加载复盘…' : '重新加载本轮复盘'}
          </button>
        ) : null}
      </div>
    );
  }
  return (
    <p className="muted-text">完成一场模拟面试后，这里会给出得分、薄弱环节和下一步练习建议。</p>
  );
}
