import type { CandidateReview, Question } from '@interview-agent/contracts';
import type { SectionState } from '@/hooks/useAdminDashboard';
import { CandidateReviewQueue } from './CandidateReviewQueue';
import { QuestionAssetsTable } from './QuestionAssetsTable';

type QuestionReviewPanelsProps = {
  questions: SectionState<Question[]>;
  candidates: SectionState<CandidateReview[]>;
  onReview: (candidateId: string) => void;
};

export function QuestionReviewPanels(props: QuestionReviewPanelsProps) {
  return (
    <section id="section-2" aria-labelledby="questions-heading">
      <div className="section-heading">
        <div>
          <div className="eyebrow">Question Governance</div>
          <h2 id="questions-heading">题库与候选题审核</h2>
        </div>
        <p>发布题目与待治理候选资产保持独立状态。</p>
      </div>
      <div className="content-grid management-tables">
        <CandidateReviewQueue state={props.candidates} onReview={props.onReview} />
        <QuestionAssetsTable state={props.questions} />
      </div>
    </section>
  );
}
