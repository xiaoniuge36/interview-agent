import { Suspense } from 'react';
import { QuestionPickerPage } from '@/components/questions/QuestionPickerPage';

export default function QuestionsRoutePage() {
  return (
    <Suspense fallback={<div className="question-picker-loading">正在打开题库…</div>}>
      <QuestionPickerPage />
    </Suspense>
  );
}
