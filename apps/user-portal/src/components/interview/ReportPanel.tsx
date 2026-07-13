import type { InterviewReport } from '@interview-agent/contracts';

type ReportPanelProps = {
  report: InterviewReport | null;
};

export function ReportPanel({ report }: ReportPanelProps) {
  return (
    <section className="panel report-card stack compact">
      <div className="eyebrow">Report</div>
      {report ? <ReportContent report={report} /> : <ReportPlaceholder />}
    </section>
  );
}

function ReportContent({ report }: { report: InterviewReport }) {
  return (
    <>
      <div className="score-hero" aria-label={'总分 ' + report.overall.score}>
        {report.overall.score}
      </div>
      <p className="muted-text">{report.overall.summary}</p>
      <div className="score-list">
        {report.stageScores.map((item) => (
          <div className="score-row" key={item.stage}>
            <span>{item.stage}</span>
            <strong>{item.score}</strong>
          </div>
        ))}
      </div>
      <div className="stack compact">
        {report.nextActions.map((item) => (
          <span className="chip" key={item}>
            {item}
          </span>
        ))}
      </div>
    </>
  );
}

function ReportPlaceholder() {
  return <p className="muted-text">完成模拟面试后，Product API 将生成结构化面试报告。</p>;
}
