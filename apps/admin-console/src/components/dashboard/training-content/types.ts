import type { CandidateQuestionDetail } from '@interview-agent/contracts';

export type ChangeHandler = () => void;

export type CandidateEditorProps = {
  candidateId: string;
  onChanged: ChangeHandler;
};

export type CandidateFormProps = {
  detail: CandidateQuestionDetail;
  onChange: (detail: CandidateQuestionDetail) => void;
  onSave: () => void;
  onPublish: () => void;
  saving: boolean;
};
