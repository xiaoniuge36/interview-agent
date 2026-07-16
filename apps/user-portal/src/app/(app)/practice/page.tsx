import { Suspense } from 'react';
import { PracticePageContent } from '@/components/practice/PracticePageContent';

export default function PracticeRoutePage() {
  return (
    <Suspense fallback={<div className="practice-player-state">正在恢复练习…</div>}>
      <PracticePageContent />
    </Suspense>
  );
}
