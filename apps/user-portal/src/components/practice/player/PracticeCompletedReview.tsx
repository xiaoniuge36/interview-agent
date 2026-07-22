'use client';

import { useState } from 'react';
import { PracticeCompletionPanel } from './PracticeCompletionPanel';
import { PracticeItemReviewDialog } from './PracticeItemReviewDialog';
import type { usePracticePlayer } from './usePracticePlayer';

type PracticePlayer = ReturnType<typeof usePracticePlayer>;

export function PracticeCompletedReview({ player }: { player: PracticePlayer }) {
  const [reviewItemId, setReviewItemId] = useState<string | null>(null);
  const session = player.session;
  if (!session) return null;
  const item = session.items.find((candidate) => candidate.id === reviewItemId) ?? null;
  const openReview = (itemId: string) => {
    setReviewItemId(itemId);
    void player.revealSolution(itemId);
  };
  return (
    <>
      <PracticeCompletionPanel
        session={session}
        report={player.report}
        mastery={player.mastery}
        message={player.message}
        onRetry={player.reload}
        onReviewItem={openReview}
        onStartNextRecommendation={() => void player.startNextRecommendation()}
        startingNextRecommendation={player.startingNextRecommendation}
      />
      {item ? (
        <PracticeItemReviewDialog
          open
          item={item}
          draft={player.drafts[item.id] ?? item.answer ?? ''}
          solution={player.solutions[item.id]}
          onClose={() => setReviewItemId(null)}
        />
      ) : null}
    </>
  );
}
