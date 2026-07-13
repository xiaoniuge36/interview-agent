import type { CandidateReview, Question } from '@interview-agent/contracts';
import type { SectionState } from '@/hooks/useAdminDashboard';
import { SectionFeedback } from './SectionState';

const PREVIEW_ITEM_LIMIT = 6;
const DIFFICULTY_LABELS: Record<Question['difficulty'], string> = {
  intro: '入门',
  easy: '简单',
  medium: '中等',
  hard: '困难',
  expert: '专家',
};
const REVIEW_STATUS_LABELS: Record<CandidateReview['status'], string> = {
  pending: '待审核',
  needs_edit: '需修改',
  approved: '已通过',
  rejected: '已拒绝',
};

type QuestionReviewPanelsProps = {
  questions: SectionState<Question[]>;
  candidates: SectionState<CandidateReview[]>;
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
      <div className="content-grid two-columns">
        <PublishedQuestionsCard state={props.questions} />
        <CandidateReviewsCard state={props.candidates} />
      </div>
    </section>
  );
}

function PublishedQuestionsCard({ state }: { state: SectionState<Question[]> }) {
  return (
    <article className="card">
      <h3>题库资产</h3>
      <p className="card-description">最近更新的公开或当前租户题目。</p>
      {state.status === 'ready' ? (
        <QuestionList questions={state.data} />
      ) : (
        <SectionFeedback state={state} loadingMessage="正在加载题库" />
      )}
    </article>
  );
}

function QuestionList({ questions }: { questions: Question[] }) {
  if (!questions.length) {
    return <div className="empty-state">当前没有可展示的题库资产。</div>;
  }
  return (
    <ul className="record-list">
      {questions.slice(0, PREVIEW_ITEM_LIMIT).map((question) => (
        <li className="record-row" key={question.id}>
          <div className="record-copy">
            <strong>{question.title}</strong>
            <span>{formatTags(question.tags)}</span>
          </div>
          <span className="status">{DIFFICULTY_LABELS[question.difficulty]}</span>
        </li>
      ))}
    </ul>
  );
}

function CandidateReviewsCard({ state }: { state: SectionState<CandidateReview[]> }) {
  return (
    <article className="card">
      <h3>候选题审核</h3>
      <p className="card-description">候选题不会在审核完成前进入正式训练集。</p>
      {state.status === 'ready' ? (
        <CandidateList candidates={state.data} />
      ) : (
        <SectionFeedback state={state} loadingMessage="正在加载候选题" />
      )}
    </article>
  );
}

function CandidateList({ candidates }: { candidates: CandidateReview[] }) {
  if (!candidates.length) {
    return <div className="empty-state">当前没有待处理的候选题。</div>;
  }
  return (
    <ul className="record-list">
      {candidates.slice(0, PREVIEW_ITEM_LIMIT).map((candidate) => (
        <li className="record-row" key={candidate.id}>
          <div className="record-copy">
            <strong>{candidate.title}</strong>
            <span>{formatTags(candidate.tags)}</span>
          </div>
          <div className="score-stack">
            <span className={statusClass(candidate.status)}>
              {REVIEW_STATUS_LABELS[candidate.status]}
            </span>
            <small>质量分 {candidate.qualityScore}</small>
          </div>
        </li>
      ))}
    </ul>
  );
}

function statusClass(status: CandidateReview['status']): string {
  if (status === 'needs_edit') return 'status warn';
  if (status === 'rejected') return 'status danger';
  return 'status';
}

function formatTags(tags: string[]): string {
  return tags.length ? tags.join(' · ') : '未标注标签';
}
