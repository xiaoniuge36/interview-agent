'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { QuestionRecommendationBanner } from './QuestionRecommendationBanner';
import { useState } from 'react';
import { shouldShowSelfPicker } from './question-picker-model';
import { SelfPickerWorkspace } from './SelfPickerWorkspace';
import { useQuestionPicker } from './useQuestionPicker';

export function QuestionPickerPage() {
  const searchParams = useSearchParams();
  const picker = useQuestionPicker();
  const [selfPickerOpened, setSelfPickerOpened] = useState(false);
  const agentHandoff = searchParams.get('source') === 'agent';
  const selfPickerVisible = shouldShowSelfPicker({
    recommendationAvailable: Boolean(picker.recommendation),
    recommendationLoading: picker.recommendationLoading,
    selectionCount: picker.selected.length,
    manuallyOpened: selfPickerOpened,
  });
  return (
    <div className="question-picker-page">
      <header className="question-picker-header">
        <div>
          <Link href="/home">题库大厅</Link>
          <span>训练入口</span>
          <h1>从一轮针对性训练开始</h1>
          <p>Agent 会先排出值得练的题；需要时，你也可以自由组合自己的题单。</p>
        </div>
        <div className="question-picker-rule">
          <strong>1–10</strong>
          <span>每轮题目数</span>
        </div>
      </header>
      <QuestionRecommendationBanner
        agentHandoff={agentHandoff}
        recommendation={picker.recommendation}
        loading={picker.recommendationLoading}
        error={picker.recommendationError}
        starting={picker.recommendationStartingId === picker.recommendation?.id}
        selfPickerExpanded={selfPickerVisible}
        onRetry={picker.reloadRecommendation}
        onStart={(recommendation) => void picker.startRecommendation(recommendation)}
        onOpenSelfPicker={() => setSelfPickerOpened(true)}
      />
      {selfPickerVisible ? <SelfPickerWorkspace picker={picker} /> : null}
    </div>
  );
}
