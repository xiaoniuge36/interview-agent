'use client';

import { FormEvent } from 'react';
import Link from 'next/link';
import { useGlobalSearch } from '../../search/GlobalSearchProvider';

export function QuestionSearchBar({ total }: { total: number | undefined }) {
  const search = useGlobalSearch();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    search.open(search.query, event.currentTarget.querySelector('input'));
  }

  return (
    <section className="question-search-hero" aria-labelledby="question-hub-heading">
      <div className="question-search-copy">
        <span className="question-hub-kicker">Question library · 自主训练</span>
        <h1 id="question-hub-heading">今天，想把哪类问题练明白？</h1>
        <p>直接搜索题目、技能或岗位方向。个人档案只用于增强 Agent 推荐，不限制你浏览和刷题。</p>
      </div>
      <form className="question-search-form" onSubmit={submit}>
        <SearchIcon />
        <input
          aria-label="搜索面试题"
          value={search.query}
          onFocus={(event) => search.open(search.query, event.currentTarget)}
          onClick={(event) => search.open(search.query, event.currentTarget)}
          onChange={(event) => search.open(event.target.value, event.currentTarget)}
          placeholder="搜索 Agent 架构、项目复盘、系统设计……"
        />
        <button type="submit">
          <span>全局搜索</span>
          <kbd>Ctrl K</kbd>
        </button>
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
