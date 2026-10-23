'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { QuestionCatalogResponse } from '@interview-agent/contracts';
import { getQuestionCatalog } from '@/lib/question-catalog-api';
import { learningShelfTopicsForCourse } from '@/lib/learning/learning-verification';

const SHELF_PAGE_SIZE = 8;

type ShelfQuestion = QuestionCatalogResponse['items'][number];
type ShelfTopic = { label: string; tag: string };
type ShelfState =
  | { status: 'loading'; items: ShelfQuestion[]; total: number; error: '' }
  | { status: 'ready'; items: ShelfQuestion[]; total: number; error: '' }
  | { status: 'error'; items: ShelfQuestion[]; total: number; error: string };

const INITIAL_STATE: ShelfState = { status: 'loading', items: [], total: 0, error: '' };

/**
 * 学习页「题目速览」：按课程主题标签拉取题库题目和参考答案。
 * 只读取已发布题目；答案仅在本次请求显式 includeAnswers 时返回。
 */
export function LearningQuestionShelf({ courseSlug }: { courseSlug: string }) {
  const topics = useMemo(() => learningShelfTopicsForCourse(courseSlug), [courseSlug]);
  if (!topics.length) return null;
  return <QuestionShelfBody key={topics.map((topic) => topic.tag).join('|')} topics={topics} />;
}

function QuestionShelfBody({ topics }: { topics: ShelfTopic[] }) {
  const { state, retry } = useShelfQuestions(topics);
  const { expandedIds, allExpanded, toggle, toggleAll } = useShelfExpansion(state.items);
  return (
    <section
      id="learning-question-shelf"
      className="learning-question-shelf"
      aria-labelledby="learning-question-shelf-heading"
    >
      <ShelfHeader
        label={topics.length > 1 ? '项目面试' : (topics[0]?.label ?? '本课')}
        linkTag={topics.length > 1 ? '项目面试题' : (topics[0]?.tag ?? '')}
        state={state}
        allExpanded={allExpanded}
        onToggleAll={toggleAll}
      />
      <ShelfContent state={state} expandedIds={expandedIds} onToggle={toggle} onRetry={retry} />
    </section>
  );
}

function useShelfQuestions(topics: readonly ShelfTopic[]) {
  const [state, setState] = useState<ShelfState>(INITIAL_STATE);
  const [reloadToken, setReloadToken] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setState(INITIAL_STATE);
    const perTopic = Math.max(1, Math.ceil(SHELF_PAGE_SIZE / topics.length));
    Promise.all(
      topics.map((topic) =>
        getQuestionCatalog({
          tags: [topic.tag],
          pageSize: perTopic,
          includeAnswers: true,
        }),
      ),
    )
      .then((catalogs) => {
        if (cancelled) return;
        setState({
          status: 'ready',
          items: catalogs.flatMap((catalog) => catalog.items),
          total: catalogs.reduce((sum, catalog) => sum + catalog.total, 0),
          error: '',
        });
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            status: 'error',
            items: [],
            total: 0,
            error: '本课题目暂时没有加载成功。',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken, topics]);
  const retry = useCallback(() => setReloadToken((token) => token + 1), []);
  return { state, retry };
}

function useShelfExpansion(items: ShelfQuestion[]) {
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(() => new Set());
  useEffect(() => setExpandedIds(new Set()), [items]);
  const toggle = useCallback((id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const allExpanded = items.length > 0 && items.every((item) => expandedIds.has(item.id));
  const toggleAll = useCallback(() => {
    setExpandedIds((current) =>
      current.size === items.length ? new Set() : new Set(items.map((item) => item.id)),
    );
  }, [items]);
  return { expandedIds, allExpanded, toggle, toggleAll };
}

function ShelfHeader({
  label,
  linkTag,
  state,
  allExpanded,
  onToggleAll,
}: {
  label: string;
  linkTag: string;
  state: ShelfState;
  allExpanded: boolean;
  onToggleAll: () => void;
}) {
  return (
    <header className="learning-question-shelf-header">
      <div>
        <span>题目速览</span>
        <h2 id="learning-question-shelf-heading">本课题目与参考答案</h2>
        <p>{shelfSummary(state, label)}</p>
      </div>
      <div className="learning-question-shelf-actions">
        {state.items.length > 1 ? (
          <button type="button" onClick={onToggleAll} aria-pressed={allExpanded}>
            {allExpanded ? '全部收起' : '全部展开'}
          </button>
        ) : null}
        <Link href={`/questions?tags=${encodeURIComponent(linkTag)}`}>去题库练这组题</Link>
      </div>
    </header>
  );
}

function ShelfContent({
  state,
  expandedIds,
  onToggle,
  onRetry,
}: {
  state: ShelfState;
  expandedIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onRetry: () => void;
}) {
  if (state.status === 'loading') {
    return (
      <p className="learning-question-shelf-state" role="status">
        正在加载本课题目与参考答案…
      </p>
    );
  }
  if (state.status === 'error') {
    return (
      <div className="learning-question-shelf-state" role="status">
        <p>{state.error}</p>
        <button type="button" onClick={onRetry}>
          重新加载
        </button>
      </div>
    );
  }
  if (!state.items.length) {
    return <p className="learning-question-shelf-state">这个主题暂时没有可速览的题目。</p>;
  }
  return (
    <ol className="learning-question-list">
      {state.items.map((question, index) => (
        <QuestionRow
          key={question.id}
          question={question}
          index={index}
          expanded={expandedIds.has(question.id)}
          onToggle={() => onToggle(question.id)}
        />
      ))}
    </ol>
  );
}

function QuestionRow({
  question,
  index,
  expanded,
  onToggle,
}: {
  question: ShelfQuestion;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const answerId = `learning-question-answer-${question.id}`;
  const project = projectLabel(question.tags);
  return (
    <li className={expanded ? 'learning-question-item expanded' : 'learning-question-item'}>
      <button
        type="button"
        className="learning-question-trigger"
        aria-expanded={expanded}
        aria-controls={answerId}
        onClick={onToggle}
      >
        <span className="learning-question-index" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="learning-question-title">
          <strong>{question.title}</strong>
          <small>
            {typeLabel(question.type)} · {difficultyLabel(question.difficulty)}
            {project ? ` · ${project}` : ''}
          </small>
        </span>
        <span className="learning-question-state" aria-hidden="true">
          {expanded ? '收起' : '看答案'}
        </span>
      </button>
      {expanded ? <QuestionAnswerPanel question={question} answerId={answerId} /> : null}
    </li>
  );
}

function QuestionAnswerPanel({
  question,
  answerId,
}: {
  question: ShelfQuestion;
  answerId: string;
}) {
  return (
    <div className="learning-question-answer" id={answerId}>
      <QuestionStem question={question} />
      <div>
        <strong>参考答案</strong>
        <p>{question.answer ?? '参考答案暂未收录，可到题库中查看。'}</p>
      </div>
      {question.rubric?.length ? <QuestionRubric rubric={question.rubric} /> : null}
    </div>
  );
}

function QuestionStem({ question }: { question: ShelfQuestion }) {
  return (
    <div>
      <strong>题目</strong>
      <p>{question.stem}</p>
      {question.options?.length ? (
        <ul className="learning-question-options">
          {question.options.map((option) => (
            <li key={option.id}>
              {option.id}. {option.text}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function QuestionRubric({ rubric }: { rubric: NonNullable<ShelfQuestion['rubric']> }) {
  return (
    <div>
      <strong>评分要点</strong>
      <ul className="learning-question-rubric">
        {rubric.map((point) => (
          <li key={point.point}>
            <span>{point.point}</span>
            <small>{point.description}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

function shelfSummary(state: ShelfState, label: string): ReactNode {
  if (state.status === 'loading') return `${label} · 正在匹配本课题目`;
  if (state.status === 'error') return `${label} · 题目加载失败`;
  const preview = state.total > state.items.length ? `，当前展示前 ${state.items.length} 道` : '';
  return `${label} · 共 ${state.total} 道相关题${preview}，点开即可对照参考答案`;
}

function projectLabel(tags: readonly string[]): string | null {
  if (tags.includes('项目:InterviewAgent')) return 'Interview Agent';
  if (tags.includes('项目:KnowledgeHub')) return 'Knowledge Hub';
  return null;
}

function typeLabel(value: ShelfQuestion['type']): string {
  const labels: Record<ShelfQuestion['type'], string> = {
    short_answer: '简答题',
    coding: '编程题',
    system_design: '系统设计',
    project_deep_dive: '项目深挖',
    behavioral: '行为面试',
    single_choice: '单选题',
    multiple_choice: '多选题',
  };
  return labels[value];
}

function difficultyLabel(value: ShelfQuestion['difficulty']): string {
  const labels: Record<ShelfQuestion['difficulty'], string> = {
    intro: '入门',
    easy: '基础',
    medium: '进阶',
    hard: '高阶',
    expert: '专家',
  };
  return labels[value];
}
