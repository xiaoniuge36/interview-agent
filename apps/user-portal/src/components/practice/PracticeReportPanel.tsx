import type { MasteryProfile, PracticeReport } from '@interview-agent/contracts';

type PracticeReportPanelProps = { report: PracticeReport; mastery: MasteryProfile[] };

export function PracticeReportPanel({ report, mastery }: PracticeReportPanelProps) {
  return (
    <div className="practice-results">
      <article className="insight-card report-card practice-report-card">
        <div className="practice-report-heading">
          <div className="practice-score">
            <strong>{Math.round(report.overallScore)}</strong>
            <span>综合表现</span>
          </div>
          <div>
            <div className="eyebrow">本轮复盘</div>
            <h3>把反馈转成下一次更好的回答</h3>
          </div>
        </div>
        <p className="practice-report-summary">{report.summary}</p>
        <div className="practice-report-lists">
          <ResultList title="表现亮点" items={report.strengths} tone="positive" />
          <ResultList title="需要加强" items={report.weaknesses} tone="attention" />
          <ResultList title="下一步建议" items={report.nextActions} tone="action" />
        </div>
      </article>
      <MasteryPanel mastery={mastery} />
    </div>
  );
}

function MasteryPanel({ mastery }: { mastery: MasteryProfile[] }) {
  return (
    <article className="insight-card practice-mastery-card">
      <div className="eyebrow">能力记录</div>
      <h3>你的能力增长轨迹</h3>
      <p className="practice-mastery-intro">持续练习后，这里会沉淀你在不同能力项上的表现。</p>
      {mastery.length ? (
        <div className="mastery-list">
          {mastery.map((profile) => (
            <div className="mastery-row" key={profile.id}>
              <div>
                <strong>{profile.tag}</strong>
                <span>{profile.evidenceCount} 次练习记录</span>
              </div>
              <div className="mastery-score">
                <strong>{Math.round(profile.score)}</strong>
                <span>能力分</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted-text">完成更多专项练习后，这里会记录你的能力变化。</p>
      )}
    </article>
  );
}

type ResultListProps = {
  title: string;
  items: string[];
  tone: 'positive' | 'attention' | 'action';
};

function ResultList({ title, items, tone }: ResultListProps) {
  if (!items.length) return null;
  return (
    <section className={'practice-result-list ' + tone}>
      <strong>{title}</strong>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
