import type { CandidateReview } from '@interview-agent/contracts';
import type { SectionState } from '@/hooks/useAdminDashboard';
import { CandidateEditor } from './training-content/CandidateEditor';

type TrainingContentWorkbenchProps = {
  candidates: SectionState<CandidateReview[]>;
  selectedCandidateId: string | null;
  onCandidateSelect: (candidateId: string) => void;
  onChanged: () => void;
};

export function TrainingContentWorkbench(props: TrainingContentWorkbenchProps) {
  return (
    <section id="section-3" aria-labelledby="training-workbench-heading">
      <div className="section-heading">
        <div>
          <div className="eyebrow">Training Operations</div>
          <h2 id="training-workbench-heading">候选题审核工作台</h2>
        </div>
        <p>编辑题目内容、记录审核结论，并发布已经通过治理检查的候选题。</p>
      </div>
      <div className="training-workbench">
        <CandidateEditor
          candidates={props.candidates}
          selectedCandidateId={props.selectedCandidateId}
          onCandidateSelect={props.onCandidateSelect}
          onChanged={props.onChanged}
        />
      </div>
    </section>
  );
}
