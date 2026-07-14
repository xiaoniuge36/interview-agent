import type { CandidateQuestionDetail, CandidateReview } from '@interview-agent/contracts';
import type { SectionState } from '@/hooks/useAdminDashboard';

export type ChangeHandler = () => void;

export type CandidateEditorProps = {
  candidates: SectionState<CandidateReview[]>;
  selectedCandidateId: string | null;
  onCandidateSelect: (candidateId: string) => void;
  onChanged: ChangeHandler;
};

export type CandidateFormProps = {
  detail: CandidateQuestionDetail;
  onChange: (detail: CandidateQuestionDetail) => void;
  onSave: () => void;
  onPublish: () => void;
  saving: boolean;
};
