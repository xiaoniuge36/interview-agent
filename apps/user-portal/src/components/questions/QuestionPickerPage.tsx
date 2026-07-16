'use client';

import Link from 'next/link';
import { QuestionCatalogList } from './QuestionCatalogList';
import { QuestionFilterPanel } from './QuestionFilterPanel';
import { SelectedQuestionTray } from './SelectedQuestionTray';
import { useQuestionPicker } from './useQuestionPicker';

export function QuestionPickerPage() {
  const picker = useQuestionPicker();
  return (
    <div className="question-picker-page">
      <header className="question-picker-header">
        <div>
          <Link href="/home">← 返回题库大厅</Link>
          <span>Manual question set</span>
          <h1>组合你的本轮题单</h1>
          <p>筛选和题单相互独立：切换方向或翻页不会清空已选题目。</p>
        </div>
        <div className="question-picker-rule"><strong>1–10</strong><span>每轮题目数</span></div>
      </header>
      <QuestionFilterPanel query={picker.query} facets={picker.catalog?.facets} onChange={picker.updateFilter} />
      <div className="question-picker-layout">
        <QuestionCatalogList
          catalog={picker.catalog}
          loading={picker.loading}
          error={picker.error}
          selectedIds={picker.selected.map((item) => item.id)}
          onToggle={picker.toggle}
          onRetry={picker.reload}
          onPage={picker.changePage}
        />
        <SelectedQuestionTray
          selected={picker.selected}
          message={picker.selectionMessage}
          error={picker.startError}
          starting={picker.starting}
          onRemove={picker.remove}
          onClear={picker.clear}
          onStart={() => void picker.start()}
        />
      </div>
    </div>
  );
}
