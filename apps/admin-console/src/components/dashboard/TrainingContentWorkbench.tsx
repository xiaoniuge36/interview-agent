import type { CandidateReview } from '@interview-agent/contracts';
import type { SectionState } from '@/hooks/useAdminDashboard';
import { CandidateEditor } from './training-content/CandidateEditor';
import { MarkdownImportForm } from './training-content/MarkdownImportForm';

type TrainingContentWorkbenchProps = {
  candidates: SectionState<CandidateReview[]>;
  onChanged: () => void;
};

export function TrainingContentWorkbench(props: TrainingContentWorkbenchProps) {
  return (
    <section id="section-3" aria-labelledby="training-workbench-heading">
      <div className="section-heading">
        <div>
          <div className="eyebrow">Training Operations</div>
          <h2 id="training-workbench-heading">Training content workspace</h2>
        </div>
        <p>Import Markdown, review generated candidates, and publish approved questions.</p>
      </div>
      <div className="content-grid two-columns training-workbench">
        <MarkdownImportForm onChanged={props.onChanged} />
        <CandidateEditor candidates={props.candidates} onChanged={props.onChanged} />
      </div>
    </section>
  );
}
