import type { QuestionCatalogResponse } from '@interview-agent/contracts';
import type { CatalogQuestion } from './useQuestionPicker';

const MAX_VISIBLE_TAGS = 4;

type QuestionCatalogListProps = {
  catalog: QuestionCatalogResponse | null;
  loading: boolean;
  error: string;
  selectedIds: string[];
  onToggle: (question: CatalogQuestion) => void;
  onRetry: () => void;
  onPage: (page: number) => void;
};

export function QuestionCatalogList(props: QuestionCatalogListProps) {
  const { catalog, loading, error, selectedIds, onToggle, onRetry, onPage } = props;
  if (loading && !catalog) return <QuestionListLoading />;
  if (error && !catalog) return <QuestionListError message={error} onRetry={onRetry} />;
  if (!catalog?.items.length) return <QuestionListEmpty />;
  return (
    <section className="question-catalog-results" aria-busy={loading}>
      <div className="question-result-summary">
        <span>找到 {catalog.total} 道题</span>
        {loading ? <small>正在更新结果…</small> : null}
      </div>
      <div className="question-catalog-list">
        {catalog.items.map((question, index) => (
          <QuestionCatalogCard
            key={question.id}
            question={question}
            number={(catalog.page - 1) * catalog.pageSize + index + 1}
            selected={selectedIds.includes(question.id)}
            onToggle={() => onToggle(question)}
          />
        ))}
      </div>
      <Pagination page={catalog.page} totalPages={catalog.totalPages} onPage={onPage} />
    </section>
  );
}

function QuestionCatalogCard({ question, number, selected, onToggle }: {
  question: CatalogQuestion;
  number: number;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <article className={selected ? 'question-catalog-card selected' : 'question-catalog-card'}>
      <button className="question-select-control" type="button" onClick={onToggle} aria-pressed={selected}>
        <span>{selected ? '✓' : '+'}</span>{selected ? '已加入题单' : '加入题单'}
      </button>
      <div className="question-card-number">Q{String(number).padStart(2, '0')}</div>
      <div className="question-card-content">
        <div className="question-card-meta">
          <span>{typeLabel(question.type)}</span><span>{difficultyLabel(question.difficulty)}</span>
        </div>
        <h2>{question.title}</h2>
        <p>{question.stem}</p>
        <div className="question-card-tags">
          {question.tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      </div>
    </article>
  );
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="question-pagination" aria-label="题库分页">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>上一页</button>
      <span>第 {page} / {totalPages} 页</span>
      <button type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>下一页</button>
    </nav>
  );
}

function QuestionListLoading() { return <div className="question-list-state"><strong>正在整理题库</strong><p>筛选结果马上就好。</p></div>; }
function QuestionListEmpty() { return <div className="question-list-state"><strong>没有匹配的题目</strong><p>调整关键词或清空部分筛选条件后再试。</p></div>; }
function QuestionListError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="question-list-state"><strong>题库加载中断</strong><p>{message}</p><button type="button" onClick={onRetry}>重新加载</button></div>;
}

function difficultyLabel(value: CatalogQuestion['difficulty']) {
  return { intro: '入门', easy: '基础', medium: '进阶', hard: '高阶', expert: '专家' }[value];
}
function typeLabel(value: CatalogQuestion['type']) {
  return { short_answer: '简答题', coding: '编程题', system_design: '系统设计', project_deep_dive: '项目深挖', behavioral: '行为面试' }[value];
}
