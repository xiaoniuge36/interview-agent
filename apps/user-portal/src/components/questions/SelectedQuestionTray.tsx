import type { CatalogQuestion } from './useQuestionPicker';

const MINUTES_PER_QUESTION = 4;
const MAX_QUESTIONS = 10;
const PERCENTAGE_TOTAL = 100;

type SelectedQuestionTrayProps = {
  selected: CatalogQuestion[];
  message: string;
  error: string;
  starting: boolean;
  onRemove: (id: string) => void;
  onClear: () => void;
  onQuickCompose: () => void;
  quickComposeDisabled: boolean;
  onStart: () => void;
};

export function SelectedQuestionTray(props: SelectedQuestionTrayProps) {
  const { selected, message, error, starting, onRemove, onClear, onQuickCompose, quickComposeDisabled, onStart } = props;
  return (
    <aside className="selected-question-tray" aria-labelledby="selected-question-heading">
      <TrayAgentNote selectedCount={selected.length} />
      <SelectionHeader selectedCount={selected.length} onClear={onClear} />
      <div
        className="selected-question-progress"
        aria-label={`题单完成度 ${selected.length}/${MAX_QUESTIONS}`}
      >
        <span style={{ width: `${(selected.length / MAX_QUESTIONS) * PERCENTAGE_TOTAL}%` }} />
      </div>
      <SelectionList selected={selected} onRemove={onRemove} />
      <SelectionFeedback message={message} error={error} />
      <QuickCompose disabled={quickComposeDisabled} onQuickCompose={onQuickCompose} />
      <SelectionFooter selectedCount={selected.length} starting={starting} onStart={onStart} />
    </aside>
  );
}

function TrayAgentNote({ selectedCount }: { selectedCount: number }) {
  return (
    <div className="selected-agent-note">
      <span aria-hidden="true"><SparkIcon /></span>
      <div>
        <strong>训练 Agent</strong>
        <p>{selectedCount ? `当前已选 ${selectedCount} 题，我会保留你的筛选和题单。` : '从知识解释到方案设计，建议控制在 3–5 题。'}</p>
        <small>档案和岗位只影响推荐，不限制自主刷题</small>
      </div>
    </div>
  );
}

function SelectionHeader({
  selectedCount,
  onClear,
}: {
  selectedCount: number;
  onClear: () => void;
}) {
  return (
    <header>
      <div>
        <span>本轮题单</span>
        <h2 id="selected-question-heading">
          已选 {selectedCount} / {MAX_QUESTIONS} 题
        </h2>
      </div>
      {selectedCount ? (
        <button type="button" onClick={onClear}>
          清空
        </button>
      ) : null}
    </header>
  );
}

function SelectionList({
  selected,
  onRemove,
}: {
  selected: CatalogQuestion[];
  onRemove: (id: string) => void;
}) {
  if (!selected.length)
    return (
      <div className="selected-question-list">
        <div className="selected-question-empty">
          <strong>还没有选择题目</strong>
          <p>从左侧加入 1–10 道题，题单会跨筛选和分页保留。</p>
        </div>
      </div>
    );
  return (
    <div className="selected-question-list">
      {selected.map((question, index) => (
        <div key={question.id}>
          <span>{index + 1}</span>
          <strong>{question.title}</strong>
          <button
            type="button"
            aria-label={`移除 ${question.title}`}
            onClick={() => onRemove(question.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function SelectionFeedback({ message, error }: { message: string; error: string }) {
  return (
    <>
      {message ? (
        <p className="selected-question-message" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="selected-question-error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}

function QuickCompose({ disabled, onQuickCompose }: { disabled: boolean; onQuickCompose: () => void }) {
  return (
    <button className="selected-question-compose" type="button" disabled={disabled} onClick={onQuickCompose}>
      <SparkIcon />
      按当前筛选快速组卷
    </button>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5ZM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z" />
    </svg>
  );
}

function SelectionFooter({
  selectedCount,
  starting,
  onStart,
}: {
  selectedCount: number;
  starting: boolean;
  onStart: () => void;
}) {
  return (
    <footer>
      <span>预计 {selectedCount * MINUTES_PER_QUESTION} 分钟 · AI 评价可选</span>
      <button type="button" disabled={!selectedCount || starting} onClick={onStart}>
        {starting ? '正在创建…' : '开始本轮练习'}
      </button>
    </footer>
  );
}
