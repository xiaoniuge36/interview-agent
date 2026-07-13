'use client';

import { PracticeReportPanel } from './PracticeReportPanel';
import { PracticeSessionPanel } from './PracticeSessionPanel';
import { PracticeStarter } from './PracticeStarter';
import { usePracticeController } from './usePracticeController';

export function PracticeWorkspace() {
  const practice = usePracticeController();
  return (
    <section className="panel practice-workspace" aria-labelledby="practice-heading">
      <PracticeHeading />
      <p className="muted-text">
        Select published questions, save every answer, then submit to receive a report and mastery
        records.
      </p>
      {!practice.session ? (
        <PracticeStarter
          title={practice.title}
          setTitle={practice.setTitle}
          busy={practice.busy === 'start'}
          onStart={practice.start}
        />
      ) : null}
      {practice.session ? (
        <PracticeSessionPanel
          session={practice.session}
          drafts={practice.drafts}
          setDrafts={practice.setDrafts}
          busy={practice.busy}
          onSave={practice.saveAnswer}
          onFinish={practice.finish}
        />
      ) : null}
      {practice.report ? (
        <PracticeReportPanel report={practice.report} mastery={practice.mastery} />
      ) : null}
      {practice.message ? (
        <p className="practice-message" role="status">
          {practice.message}
        </p>
      ) : null}
    </section>
  );
}

function PracticeHeading() {
  return (
    <div className="row-between practice-heading">
      <div>
        <div className="eyebrow">Practice</div>
        <h2 id="practice-heading" className="h2">
          Focused practice and mastery
        </h2>
      </div>
      <span className="chip">Scoring: deterministic fallback</span>
    </div>
  );
}
