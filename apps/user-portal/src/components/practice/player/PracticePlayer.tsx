'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { confirmPracticeNavigation, practiceProgress } from './practice-player-model';
import { PracticeCoachPanel } from './PracticeCoachPanel';
import { PracticeCompletedReview } from './PracticeCompletedReview';
import { PracticeEntry } from './PracticeEntry';
import { PracticeEvidenceStrip } from './PracticeEvidenceStrip';
import { PracticeFeedbackLauncher } from './PracticeFeedbackLauncher';
import { PracticeItemReviewDialog } from './PracticeItemReviewDialog';
import { PracticeNavigationDialog } from './PracticeNavigationDialog';
import { PracticeQuestionNav } from './PracticeQuestionNav';
import { PracticeQuestionStage } from './PracticeQuestionStage';
import { PracticeRoundCompletionBar } from './PracticeRoundCompletionBar';
import { usePracticePlayer } from './usePracticePlayer';

type PracticePlayerState = ReturnType<typeof usePracticePlayer>;
type PracticeStep = 'answer' | 'feedback';

export function PracticePlayer() {
  const player = usePracticePlayer();
  if (!player.sessionId) return <PracticeEntry />;
  if (player.loading)
    return <PlayerState title="正在恢复练习" copy="回答、进度和已生成的评价正在同步。" />;
  if (player.loadError || !player.session)
    return <PlayerError message={player.loadError} onRetry={player.reload} />;
  if (player.session.status !== 'in_progress') return <Completion player={player} />;
  return <ActivePractice player={player} />;
}

function Completion({ player }: { player: PracticePlayerState }) {
  return <PracticeCompletedReview player={player} />;
}

function ActivePractice({ player }: { player: PracticePlayerState }) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [step, setStep] = useState<PracticeStep>('answer');
  const [confirmAiOnOpen, setConfirmAiOnOpen] = useState(false);
  const session = player.session;
  if (!session) return null;
  const item = session.items[player.currentIndex] ?? session.items[0]!;
  const draft = player.drafts[item.id] ?? '';
  const openFeedback = (confirmAi: boolean) => {
    setConfirmAiOnOpen(confirmAi);
    setStep('feedback');
  };
  const showAnswer = () => {
    setConfirmAiOnOpen(false);
    setStep('answer');
  };
  return (
    <div className="practice-player-page" data-user-agent-scope="practice-player">
      <PlayerHeader title={session.title} progress={practiceProgress(session)} />
      <PracticeEvidenceStrip session={session} compact />
      {player.message ? <PlayerMessage message={player.message} /> : null}
      <PracticeSessionContent
        player={player}
        item={item}
        draft={draft}
        step={step}
        confirmAiOnOpen={confirmAiOnOpen}
        onOpenFeedback={openFeedback}
        onShowAnswer={showAnswer}
        onOpenReview={() => setReviewOpen(true)}
      />
      <PracticeItemReviewDialog
        open={reviewOpen}
        item={item}
        draft={draft}
        solution={player.solutions[item.id]}
        onClose={() => setReviewOpen(false)}
      />
    </div>
  );
}

type PracticeItem = NonNullable<PracticePlayerState['session']>['items'][number];
type PendingNavigation = {
  confirmation: NonNullable<ReturnType<typeof confirmPracticeNavigation>>;
  index: number;
};
type PracticeNavigationOptions = {
  item: PracticeItem;
  onConfirmRequired: (pending: PendingNavigation) => void;
  onOpenFeedback: (confirmAi: boolean) => void;
  onShowAnswer: () => void;
  player: PracticePlayerState;
};

type PracticeSessionContentProps = {
  player: PracticePlayerState;
  item: PracticeItem;
  draft: string;
  step: PracticeStep;
  confirmAiOnOpen: boolean;
  onOpenFeedback: (confirmAi: boolean) => void;
  onShowAnswer: () => void;
  onOpenReview: () => void;
};

function PracticeSessionContent(props: PracticeSessionContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(null);
  const session = props.player.session!;
  const navigation = practiceNavigation({
    item: props.item,
    onConfirmRequired: setPendingNavigation,
    onOpenFeedback: props.onOpenFeedback,
    onShowAnswer: props.onShowAnswer,
    player: props.player,
  });
  useEffect(() => {
    if (props.step === 'feedback') contentRef.current?.scrollIntoView({ block: 'start' });
  }, [props.step]);
  const confirmNavigation = () => {
    if (!pendingNavigation) return;
    const index = pendingNavigation.index;
    setPendingNavigation(null);
    props.onShowAnswer();
    props.player.setCurrentIndex(index);
  };
  return (
    <>
      <div ref={contentRef} className="practice-player-layout" data-step={props.step}>
        <PracticeQuestionNav
          session={session}
          currentIndex={props.player.currentIndex}
          disabled={props.player.busy !== null}
          onSelect={navigation.selectIndex}
        />
        {props.step === 'answer' ? (
          <PracticeAnswerStep {...props} navigation={navigation} />
        ) : (
          <PracticeFeedbackStep {...props} />
        )}
      </div>
      {pendingNavigation ? (
        <PracticeNavigationDialog
          confirmation={pendingNavigation.confirmation}
          onCancel={() => setPendingNavigation(null)}
          onConfirm={confirmNavigation}
        />
      ) : null}
    </>
  );
}

function PracticeAnswerStep(
  props: PracticeSessionContentProps & { navigation: ReturnType<typeof practiceNavigation> },
) {
  const { player, item, draft, navigation, onOpenFeedback } = props;
  return (
    <>
      <PracticeQuestionStage
        item={item}
        draft={draft}
        busy={player.busy}
        currentIndex={player.currentIndex}
        total={player.session!.items.length}
        onDraft={(value) => player.updateDraft(item.id, value)}
        onSave={() => void player.save(item.id)}
        onSaveAndNext={() => void navigation.saveAndNext()}
        onSaveAndFeedback={() => void navigation.saveAndFeedback()}
        onOpenFeedback={() => onOpenFeedback(true)}
        onPrevious={navigation.movePrevious}
        onNext={navigation.moveNext}
      />
      <PracticeFeedbackLauncher
        item={item}
        draft={draft}
        busy={player.busy}
        onOpen={() => onOpenFeedback(false)}
      />
    </>
  );
}

function PracticeFeedbackStep(props: PracticeSessionContentProps) {
  const { player, item } = props;
  const hasNextQuestion = player.currentIndex < player.session!.items.length - 1;
  const showNextQuestion = () => {
    if (!hasNextQuestion || player.busy !== null) return;
    player.setCurrentIndex(player.currentIndex + 1);
    props.onShowAnswer();
  };
  return (
    <>
      <PracticeCoachPanel
        sessionId={player.sessionId!}
        item={item}
        draft={props.draft}
        solution={player.solutions[item.id]}
        busy={player.busy}
        issue={player.issue}
        aiOperation={player.aiOperation}
        confirmAiOnOpen={props.confirmAiOnOpen}
        onRevealSolution={() => void player.revealSolution(item.id)}
        onEvaluate={() => void player.evaluate(item.id)}
        onOpenReview={props.onOpenReview}
        onBackToAnswer={props.onShowAnswer}
        hasNextQuestion={hasNextQuestion}
        onNextQuestion={showNextQuestion}
      />
      <PracticeRoundCompletionBar player={player} />
    </>
  );
}

function practiceNavigation(options: PracticeNavigationOptions) {
  const { item, onConfirmRequired, onOpenFeedback, onShowAnswer, player } = options;
  const session = player.session!;
  const selectIndex = (index: number) => {
    if (index === player.currentIndex || player.busy !== null) return;
    const confirmation = confirmPracticeNavigation(item, player.drafts[item.id] ?? '');
    if (confirmation) return onConfirmRequired({ confirmation, index });
    onShowAnswer();
    player.setCurrentIndex(index);
  };
  const saveAndNext = async () => {
    if (await player.save(item.id))
      player.setCurrentIndex(Math.min(session.items.length - 1, player.currentIndex + 1));
  };
  const saveAndFeedback = async () => {
    if (await player.save(item.id)) onOpenFeedback(true);
  };
  return {
    selectIndex,
    saveAndNext,
    saveAndFeedback,
    movePrevious: () => selectIndex(Math.max(0, player.currentIndex - 1)),
    moveNext: () => selectIndex(Math.min(session.items.length - 1, player.currentIndex + 1)),
  };
}

function PlayerHeader({
  title,
  progress,
}: {
  title: string;
  progress: ReturnType<typeof practiceProgress>;
}) {
  return (
    <header className="practice-player-header">
      <div>
        <Link href="/questions">← 返回题库</Link>
        <span>专注练习</span>
        <h1>{title}</h1>
      </div>
      <div className="practice-player-progress">
        <span>
          {progress.answered}/{progress.total} 已回答 · {progress.evaluated} 已评价
        </span>
        <progress value={progress.answered} max={progress.total} />
      </div>
    </header>
  );
}

function PlayerMessage({ message }: { message: string }) {
  return (
    <p className="practice-player-message" role="status">
      {message}
    </p>
  );
}

function PlayerState({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="practice-player-state">
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  );
}

function PlayerError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="practice-player-state">
      <strong>练习没有加载成功</strong>
      <p>{message}</p>
      <button type="button" onClick={onRetry}>
        重新加载
      </button>
      <Link href="/questions">返回题库</Link>
    </div>
  );
}
