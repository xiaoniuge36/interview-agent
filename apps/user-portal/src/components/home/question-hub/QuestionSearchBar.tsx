'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function QuestionSearchBar({ total }: { total: number | undefined }) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/questions?query=${encodeURIComponent(value)}` : '/questions');
  }

  return (
    <section className="question-search-hero" aria-labelledby="question-hub-heading">
      <div className="question-search-copy">
        <span className="question-hub-kicker">Question library · 自主训练</span>
        <h1 id="question-hub-heading">今天，想把哪类问题练明白？</h1>
        <p>
          直接搜索题目、技能或岗位方向。个人档案只用于增强 Agent 推荐，不限制你浏览和刷题。
        </p>
      </div>
      <form className="question-search-form" onSubmit={submit}>
        <SearchIcon />
        <input
          aria-label="搜索面试题"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索 Agent 架构、项目复盘、系统设计……"
        />
        <button type="submit">搜索题库</button>
      </form>
      <div className="question-search-meta">
        <span>{total === undefined ? '正在同步题库' : `${total} 道已发布题目`}</span>
        <span aria-hidden="true">·</span>
        <Link href="/questions?difficulty=intro">从入门题开始</Link>
        <Link href="/questions?type=behavioral">练行为面试</Link>
      </div>
    </section>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.8" cy="10.8" r="6.3" />
      <path d="m16 16 4.2 4.2" />
    </svg>
  );
}
