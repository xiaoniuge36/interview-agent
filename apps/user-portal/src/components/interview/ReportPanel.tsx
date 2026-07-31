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
    <section id="interview-report" className="panel report-card stack compact" tabIndex={-1}>
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
      <StageDiagnostics stages={report.stageScores} />
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

function StageDiagnostics({ stages }: { stages: InterviewReport['stageScores'] }) {
  const rankedStages = [...stages].sort((left, right) => left.score - right.score);
  return (
    <section className="report-stage-diagnostics" aria-labelledby="report-stage-heading">
      <div className="report-stage-heading">
        <h3 id="report-stage-heading">阶段诊断</h3>
        <small>先看最低分，理解评分依据</small>
      </div>
      <div className="report-stage-list">
        {rankedStages.map((item, index) => (
          <details key={item.stage} open={index === 0} data-priority={index === 0}>
            <summary>
              <span>
                <strong>{interviewStageLabel(item.stage)}</strong>
                <small>{index === 0 ? '首要复练' : '阶段反馈'}</small>
              </span>
              <b>{item.score}</b>
            </summary>
            <p>{item.summary}</p>
            {item.evidence.length ? (
              <ul aria-label={`${interviewStageLabel(item.stage)}评分依据`}>
                {item.evidence.map((evidence) => (
                  <li key={evidence}>{evidence}</li>
                ))}
              </ul>
            ) : null}
            <small>为什么是 {item.score} 分</small>
          </details>
        ))}
      </div>
    </section>
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
  const state = reportPlaceholderState(status, Boolean(onRetry));
  if (state) {
    return (
      <div className="interview-report-status" data-state={state.kind} role="status">
        <strong>{state.title}</strong>
        <p>{state.detail}</p>
        {onRetry && state.actionLabel ? (
          <button className="button secondary" type="button" disabled={retrying} onClick={onRetry}>
            {retrying ? state.retryingLabel : state.actionLabel}
          </button>
        ) : null}
      </div>
    );
  }
  return (
    <p className="muted-text">完成一场模拟面试后，这里会给出得分、薄弱环节和下一步练习建议。</p>
  );
}

type ReportPlaceholderState = {
  kind: 'processing' | 'failed' | 'partial';
  title: string;
  detail: string;
  actionLabel: string | null;
  retryingLabel: string;
};

function reportPlaceholderState(
  status: InterviewSessionStatus | null,
  canRetry: boolean,
): ReportPlaceholderState | null {
  if (status === 'generating_report') {
    return {
      kind: 'processing',
      title: 'AI 正在生成本轮复盘',
      detail: '阶段和面试对话已保存。页面会自动接收结果，刷新后仍会恢复同一轮。',
      actionLabel: canRetry ? '重新检查生成状态' : null,
      retryingLabel: '正在检查生成状态…',
    };
  }
  if (status === 'failed') {
    return {
      kind: 'failed',
      title: '本轮复盘未完成',
      detail: '已保存的面试对话不会丢失。先重新检查本轮状态；若仍失败，再确认后重新开始。',
      actionLabel: canRetry ? '重新检查本轮状态' : null,
      retryingLabel: '正在检查本轮状态…',
    };
  }
  if (status === 'report_ready') {
    return {
      kind: 'partial',
      title: 'AI 复盘已生成',
      detail: `报告内容暂时无法读取。${canRetry ? '可在此重新加载。' : '刷新页面可重试。'}`,
      actionLabel: canRetry ? '重新加载本轮复盘' : null,
      retryingLabel: '正在重新加载复盘…',
    };
  }
  return null;
}
