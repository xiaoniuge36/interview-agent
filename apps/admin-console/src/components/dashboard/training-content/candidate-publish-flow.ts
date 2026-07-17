import type {
  CandidateQuestionDetail,
  Question,
  UpdateCandidateQuestionInput,
} from '@interview-agent/contracts';
import { candidateUpdateInput } from './training-utils';

type CandidateUpdater = (
  candidateId: string,
  input: UpdateCandidateQuestionInput,
) => Promise<CandidateQuestionDetail>;
type CandidatePublisher = (candidateId: string) => Promise<Question>;

export async function saveAndPublishCandidate(
  candidate: CandidateQuestionDetail,
  updateCandidate: CandidateUpdater,
  publishCandidate: CandidatePublisher,
) {
  if (candidate.publishedQuestionId) {
    const question = await publishCandidate(candidate.id);
    return { candidate, question };
  }
  if (candidate.status !== 'approved') {
    throw new Error('候选题需要先选择“通过”才能发布。');
  }
  const savedCandidate = await updateCandidate(candidate.id, candidateUpdateInput(candidate));
  if (savedCandidate.status !== 'approved') {
    throw new Error('候选题必须保存为“通过”后才能发布。');
  }
  const question = await publishCandidate(savedCandidate.id);
  return { candidate: savedCandidate, question };
}
