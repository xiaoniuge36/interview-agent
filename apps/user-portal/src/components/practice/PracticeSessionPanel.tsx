import type { PracticeSession } from '@interview-agent/contracts';
import type { Dispatch, SetStateAction } from 'react';
import type { BusyAction } from './types';

type PracticeSessionPanelProps = {
  session: PracticeSession;
  drafts: Record<string, string>;
  setDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  busy: BusyAction;
  onSave: (itemId: string) => void;
  onFinish: () => void;
};

export function PracticeSessionPanel(props: PracticeSessionPanelProps) {
  const ready = props.session.items.every((item) => item.status !== 'pending');
  const isFinished = props.session.status === 'report_ready';
  return (
    <div className="practice-session">
      <SessionHeader session={props.session} />
      {props.session.items.map((item) => (
        <PracticeQuestion key={item.id} item={item} {...props} isFinished={isFinished} />
      ))}
      <FinishPracticeButton
        ready={ready}
        isFinished={isFinished}
        busy={props.busy}
        onFinish={props.onFinish}
      />
      {!ready && !isFinished ? (
        <p className="muted-text">Save every answer before submitting the practice.</p>
      ) : null}
    </div>
  );
}

function SessionHeader({ session }: { session: PracticeSession }) {
  return (
    <div className="row-between">
      <strong>{session.title}</strong>
      <span className="chip">{session.items.length} questions</span>
    </div>
  );
}

type PracticeQuestionProps = PracticeSessionPanelProps & {
  item: PracticeSession['items'][number];
  isFinished: boolean;
};

function PracticeQuestion(props: PracticeQuestionProps) {
  const itemBusy = props.busy === `answer:${props.item.id}`;
  return (
    <article className="practice-question">
      <div className="stage">
        Question {props.item.sequence} ? {props.item.question.difficulty}
      </div>
      <h3>{props.item.question.title}</h3>
      <p>{props.item.question.stem}</p>
      <textarea
        className="textarea large"
        value={props.drafts[props.item.id] ?? ''}
        disabled={props.isFinished || itemBusy}
        onChange={(event) =>
          props.setDrafts((drafts) => ({ ...drafts, [props.item.id]: event.target.value }))
        }
      />
      <div className="practice-actions">
        <span className="chip">{props.item.status === 'pending' ? 'Pending save' : 'Saved'}</span>
        <SaveAnswerButton
          itemId={props.item.id}
          itemBusy={itemBusy}
          disabled={props.isFinished || props.busy !== null}
          onSave={props.onSave}
        />
      </div>
    </article>
  );
}

type SaveAnswerButtonProps = {
  itemId: string;
  itemBusy: boolean;
  disabled: boolean;
  onSave: (itemId: string) => void;
};

function SaveAnswerButton({ itemId, itemBusy, disabled, onSave }: SaveAnswerButtonProps) {
  return (
    <button
      className="button secondary compact-button"
      type="button"
      disabled={disabled}
      onClick={() => void onSave(itemId)}
    >
      {itemBusy ? 'Saving?' : 'Save answer'}
    </button>
  );
}

type FinishPracticeButtonProps = {
  ready: boolean;
  isFinished: boolean;
  busy: BusyAction;
  onFinish: () => void;
};

function FinishPracticeButton({ ready, isFinished, busy, onFinish }: FinishPracticeButtonProps) {
  return (
    <button
      className="button"
      type="button"
      disabled={!ready || isFinished || busy !== null}
      onClick={() => void onFinish()}
    >
      {busy === 'submit' ? 'Scoring?' : 'Submit and generate report'}
    </button>
  );
}
