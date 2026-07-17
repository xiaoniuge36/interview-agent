import { Suspense } from 'react';
import { PracticePageContent } from '@/components/practice/PracticePageContent';
import { RouteLoadingState } from '@/components/shell/RouteLoadingState';

export default function PracticeRoutePage() {
  return (
    <Suspense fallback={<RouteLoadingState label="正在恢复练习" />}>
      <PracticePageContent />
    </Suspense>
  );
}
