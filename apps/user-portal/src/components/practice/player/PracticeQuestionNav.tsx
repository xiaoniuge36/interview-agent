import type { PracticeSession } from '@interview-agent/contracts';

type PracticeQuestionNavProps = {
  session: PracticeSession;
  currentIndex: number;
  disabled: boolean;
  onSelect: (index: number) => void;
};

export function PracticeQuestionNav({
  session,
  currentIndex,
  disabled,
  onSelect,
}: PracticeQuestionNavProps) {
  return (
    <nav className="practice-question-nav" aria-label="本轮题目">
      <div className="practice-nav-title">
        <span>本轮题单</span>
        <strong>{session.items.length} 道题</strong>
      </div>
      <div className="practice-nav-items">
        {session.items.map((item, index) => (
          <button
            key={item.id}
            className={currentIndex === index ? 'active' : ''}
            data-status={item.evaluation ? 'evaluated' : item.answer ? 'answered' : 'pending'}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(index)}
            aria-current={currentIndex === index ? 'step' : undefined}
          >
            <span>{item.sequence}</span>
            <small>{statusLabel(item)}</small>
          </button>
        ))}
      </div>
      <div className="practice-nav-legend">
        <span>
          <i data-tone="pending" />
          待作答
        </span>
        <span>
          <i data-tone="answered" />
          已保存
        </span>
        <span>
          <i data-tone="evaluated" />
          已评价
        </span>
      </div>
    </nav>
  );
}

function statusLabel(item: PracticeSession['items'][number]) {
  if (item.evaluation) return '已评价';
  if (item.answer) return '已保存';
  return '待作答';
}
