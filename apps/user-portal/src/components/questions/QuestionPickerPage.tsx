'use client';

import Link from 'next/link';
import { QuestionCatalogList } from './QuestionCatalogList';
import { QuestionFilterPanel } from './QuestionFilterPanel';
import { QuestionRecommendationBanner } from './QuestionRecommendationBanner';
import { SelectedQuestionTray } from './SelectedQuestionTray';
import { useQuestionPicker } from './useQuestionPicker';

export function QuestionPickerPage() {
  const picker = useQuestionPicker();
  return (
    <div className="question-picker-page">
      <header className="question-picker-header">
        <div>
          <Link href="/home">题库大厅</Link>
          <span>自主组卷</span>
          <h1>今天想练什么？</h1>
          <p>自主选题随时可用，Agent 只负责把更值得练的题排到你面前。</p>
        </div>
        <div className="question-picker-rule"><strong>1–10</strong><span>每轮题目数</span></div>
      </header>
      <QuestionFilterPanel query={picker.query} facets={picker.catalog?.facets} onChange={picker.updateFilter} />
      <QuestionRecommendationBanner
        recommendation={picker.recommendation}
        loading={picker.recommendationLoading}
        error={picker.recommendationError}
        starting={picker.recommendationStartingId === picker.recommendation?.id}
        onRetry={picker.reloadRecommendation}
        onStart={(recommendation) => void picker.startRecommendation(recommendation)}
      />
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
          onQuickCompose={picker.quickCompose}
          quickComposeDisabled={!picker.catalog?.items.length}
          onStart={() => void picker.start()}
        />
      </div>
    </div>
  );
}
