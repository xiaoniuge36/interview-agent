import { Suspense } from 'react';
import { QuestionPickerPage } from '@/components/questions/QuestionPickerPage';
import { RouteLoadingState } from '@/components/shell/RouteLoadingState';

export default function QuestionsRoutePage() {
  return (
    <Suspense fallback={<RouteLoadingState label="正在打开题库" />}>
      <QuestionPickerPage />
    </Suspense>
  );
}
