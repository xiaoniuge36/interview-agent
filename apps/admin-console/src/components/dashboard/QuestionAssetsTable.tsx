import type { Question } from '@interview-agent/contracts';
import { useDeferredValue, useMemo, useState } from 'react';
import type { SectionState } from '@/hooks/useAdminDashboard';
import { AdminPagination, AdminTableToolbar } from './AdminTableControls';
import { filterQuestions, paginateRecords } from './admin-records';
import { SectionFeedback } from './SectionState';

const PAGE_SIZE = 8;
const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'published', label: '已发布' },
  { value: 'draft', label: '草稿' },
  { value: 'disabled', label: '已停用' },
  { value: 'archived', label: '已归档' },
] as const;
const DIFFICULTY_OPTIONS = [
  { value: 'all', label: '全部难度' },
  { value: 'intro', label: '入门' },
  { value: 'easy', label: '简单' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困难' },
  { value: 'expert', label: '专家' },
] as const;
const TYPE_LABELS: Record<Question['type'], string> = {
  short_answer: '简答题',
  coding: '编程题',
  system_design: '系统设计',
  project_deep_dive: '项目深挖',
  behavioral: '行为面试',
};

export function QuestionAssetsTable({ state }: { state: SectionState<Question[]> }) {
  return (
    <article className="card management-table-card">
      <div className="card-title-row">
        <div>
          <h3>正式题库</h3>
          <p className="card-description">查看公开题目与当前租户题目的发布状态。</p>
        </div>
      </div>
      {state.status === 'ready' ? (
        <ReadyQuestionTable questions={state.data} />
      ) : (
        <SectionFeedback state={state} loadingMessage="正在加载题库" />
      )}
    </article>
  );
}

function ReadyQuestionTable({ questions }: { questions: Question[] }) {
  const table = useQuestionTable(questions);
  return (
    <>
      <AdminTableToolbar
        query={table.query}
        searchLabel="搜索题目、正文或标签"
        resultLabel={`筛选出 ${table.pagination.total} 条`}
        filters={table.filters}
        onQueryChange={table.changeQuery}
      />
      <QuestionTable questions={table.pagination.items} />
      <AdminPagination {...table.pagination} onChange={table.setPage} />
    </>
  );
}

function useQuestionTable(questions: Question[]) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Question['status'] | 'all'>('all');
  const [difficulty, setDifficulty] = useState<Question['difficulty'] | 'all'>('all');
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query);
  const filtered = useMemo(
    () => filterQuestions(questions, { query: deferredQuery, status, difficulty }),
    [deferredQuery, difficulty, questions, status],
  );
  const updateStatus = (value: string) => {
    setStatus(value as Question['status'] | 'all');
    setPage(1);
  };
  const updateDifficulty = (value: string) => {
    setDifficulty(value as Question['difficulty'] | 'all');
    setPage(1);
  };
  const changeQuery = (value: string) => {
    setQuery(value);
    setPage(1);
  };
  return {
    query,
    changeQuery,
    setPage,
    pagination: paginateRecords(filtered, page, PAGE_SIZE),
    filters: [
      { label: '状态', value: status, options: STATUS_OPTIONS, onChange: updateStatus },
      { label: '难度', value: difficulty, options: DIFFICULTY_OPTIONS, onChange: updateDifficulty },
    ],
  };
}

function QuestionTable({ questions }: { questions: Question[] }) {
  if (!questions.length) return <div className="empty-state compact-empty">没有匹配的题目。</div>;
  return (
    <div className="table-scroll">
      <table className="data-table management-table">
        <caption className="visually-hidden">正式题库列表</caption>
        <thead>
          <tr>
            <th scope="col">题目</th>
            <th scope="col">题型</th>
            <th scope="col">难度</th>
            <th scope="col">可见范围</th>
            <th scope="col">状态</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((question) => (
            <tr key={question.id}>
              <td>
                <strong>{question.title}</strong>
                <span>{question.tags.length ? question.tags.join(' · ') : '未标注标签'}</span>
              </td>
              <td>{TYPE_LABELS[question.type]}</td>
              <td>{difficultyLabel(question.difficulty)}</td>
              <td>{question.visibility === 'public' ? '公开' : '当前租户'}</td>
              <td>
                <span className={question.status === 'disabled' ? 'status danger' : 'status'}>
                  {statusLabel(question.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function difficultyLabel(value: Question['difficulty']): string {
  return { intro: '入门', easy: '简单', medium: '中等', hard: '困难', expert: '专家' }[value];
}

function statusLabel(value: Question['status']): string {
  return { draft: '草稿', published: '已发布', disabled: '已停用', archived: '已归档' }[value];
}
