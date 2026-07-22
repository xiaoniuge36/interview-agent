'use client';

import React, { type ReactNode } from 'react';
import { useGlobalSearch } from './GlobalSearchProvider';

export function GlobalSearchTrigger({ actions }: { actions?: ReactNode }) {
  const search = useGlobalSearch();
  return (
    <GlobalSearchTriggerView
      isOpen={search.isOpen}
      onOpen={(trigger) => search.open('', trigger)}
      actions={actions}
    />
  );
}

export function GlobalSearchTriggerView({
  isOpen,
  onOpen,
  actions,
}: {
  isOpen: boolean;
  onOpen: (trigger: HTMLElement) => void;
  actions?: ReactNode;
}) {
  return (
    <header className="global-search-dock" aria-label="全局搜索入口">
      <div className="global-search-dock-inner">
        <div className="global-search-dock-brand" aria-hidden="true">
          <span>✦</span>
          <strong>Agent 导航</strong>
        </div>
        <button
          className="global-search-trigger"
          type="button"
          aria-label="打开全局搜索"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onClick={(event) => onOpen(event.currentTarget)}
        >
          <SearchIcon />
          <span className="global-search-trigger-copy">
            <strong className="global-search-trigger-desktop-copy">
              搜索题目、题库专题或功能页面
            </strong>
            <strong className="global-search-trigger-mobile-copy">搜索全部</strong>
            <small>在当前页面直接查找，不打断训练进度</small>
          </span>
          <kbd>Ctrl K</kbd>
        </button>
        <div className="global-search-dock-actions">
          <span className="global-search-dock-scope">题目 · 专题 · 页面</span>
          {actions}
        </div>
      </div>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.4" />
      <path d="m15.3 15.3 4.7 4.7" />
    </svg>
  );
}
