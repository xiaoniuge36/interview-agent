import type { MasteryProfile, PracticeReport } from '@interview-agent/contracts';

type PracticeReportPanelProps = { report: PracticeReport; mastery: MasteryProfile[] };

export function PracticeReportPanel({ report, mastery }: PracticeReportPanelProps) {
  return (
    <div className="practice-results">
      <article className="insight-card report-card">
        <div className="score-hero">{Math.round(report.overallScore)}</div>
        <h3>Practice report</h3>
        <p>{report.summary}</p>
        <ResultList title="Next actions" items={report.nextActions} />
      </article>
      <MasteryPanel mastery={mastery} />
    </div>
  );
}

function MasteryPanel({ mastery }: { mastery: MasteryProfile[] }) {
  return (
    <article className="insight-card">
      <h3>Mastery profile</h3>
      {mastery.length ? (
        <div className="score-list">
          {mastery.map((profile) => (
            <div className="score-row" key={profile.id}>
              <span>{profile.tag}</span>
              <strong>{Math.round(profile.score)}</strong>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted-text">Complete a practice to accumulate mastery records.</p>
      )}
    </article>
  );
}

function ResultList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <strong>{title}</strong>
      <ul className="practice-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
