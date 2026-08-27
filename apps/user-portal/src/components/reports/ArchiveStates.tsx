import Link from 'next/link';
import type { TrainingRecordFilter } from './training-records-model';

export function ArchiveEmpty({ filter, query }: { filter: TrainingRecordFilter; query: string }) {
  const search = query.trim();
  const copy = search
    ? `没有找到包含“${search}”的训练记录。试试标题、类型、状态或薄弱项。`
    : filter === 'interview'
      ? '还没有模拟面试记录。开始一场面试，让反馈沉淀下来。'
      : filter === 'practice'
        ? '还没有刷题复盘。完成一轮题单后，这里会标出可补强的要点。'
        : '还没有训练记录。选一道题或开始一次模拟面试，第一份复盘会出现在这里。';
  return (
    <section className="training-archive-empty">
      <span>训练从第一条证据开始</span>
      <h2>这里会沉淀每一轮训练</h2>
      <p>{copy}</p>
      <Link className="button" href={filter === 'interview' ? '/interview' : '/questions'}>
        {filter === 'interview' ? '开始模拟面试' : '去选择题目'}
      </Link>
    </section>
  );
}

export function ArchiveState({
  title,
  copy,
  onRetry,
}: {
  title: string;
  copy: string;
  onRetry?: () => void;
}) {
  return (
    <section className="training-archive-empty" aria-live="polite">
      <span>训练档案</span>
      <h2>{title}</h2>
      <p>{copy}</p>
      {onRetry ? (
        <button className="button" type="button" onClick={onRetry}>
          重新读取
        </button>
      ) : null}
    </section>
  );
}
