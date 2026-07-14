import { CONTRACT_LIMITS } from '@interview-agent/contracts';
import type { PracticeSession } from '@interview-agent/contracts';
import type { Dispatch, SetStateAction } from 'react';
import { difficultyLabel } from './practice-utils';
import type { BusyAction } from './types';

const VISIBLE_TAG_LIMIT = 4;

type PracticeSessionPanelProps = {
  session: PracticeSession;
  drafts: Record<string, string>;
  setDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  busy: BusyAction;
  onSave: (itemId: string) => void;
  onFinish: () => void;
};

export function PracticeSessionPanel(props: PracticeSessionPanelProps) {
  const savedCount = props.session.items.filter((item) => item.status !== 'pending').length;
  const ready = canGenerateReport(props.session, props.drafts);
  const isFinished = props.session.status === 'report_ready';
  return (
    <div className="practice-session">
      <SessionHeader session={props.session} savedCount={savedCount} />
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
        <p className="practice-help-text">
          完成并保存全部回答后，即可生成本轮复盘。
        </p>
      ) : null}
    </div>
  );
}

function canGenerateReport(session: PracticeSession, drafts: Record<string, string>) {
  return session.items.every((item) => {
    const draft = drafts[item.id]?.trim() ?? '';
    const savedAnswer = item.answer?.trim() ?? '';
    return item.status !== 'pending' && draft === savedAnswer;
  });
}

function SessionHeader({ session, savedCount }: { session: PracticeSession; savedCount: number }) {
  const questionCount = session.items.length;
  return (
    <header className="practice-session-header">
      <div>
        <div className="eyebrow">本轮专项练习</div>
        <h3>{session.title}</h3>
        <p>建议结合问题背景、个人职责、关键决策与可验证结果来组织回答。</p>
      </div>
      <div className="practice-progress-wrap">
        <span>{savedCount} / {questionCount} 题已保存</span>
        <progress
          className="practice-progress"
          value={savedCount}
          max={questionCount}
          aria-label="本轮练习完成进度"
        />
      </div>
    </header>
  );
}

type PracticeQuestionProps = PracticeSessionPanelProps & {
  item: PracticeSession['items'][number];
  isFinished: boolean;
};

function PracticeQuestion(props: PracticeQuestionProps) {
  const answerState = getAnswerState(props);
  return (
    <article className="practice-question">
      <div className="practice-question-heading">
        <div>
          <div className="stage">第 {props.item.sequence} 题</div>
          <h3>{props.item.question.title}</h3>
        </div>
        <span className="practice-difficulty">{difficultyLabel(props.item.question.difficulty)}</span>
      </div>
      <p>{props.item.question.stem}</p>
      <QuestionTags tags={props.item.question.tags} />
      <label className="practice-answer-label" htmlFor={'practice-answer-' + props.item.id}>
        <span>我的回答</span>
        <span>重点说明你的判断过程、行动和最终结果。</span>
      </label>
      <textarea
        id={'practice-answer-' + props.item.id}
        className="textarea large"
        value={answerState.draft}
        maxLength={CONTRACT_LIMITS.longText}
        disabled={props.isFinished || answerState.itemBusy}
        placeholder="写下你的回答，尽量补充场景、职责、行动与结果。"
        onChange={(event) =>
          props.setDrafts((drafts) => ({ ...drafts, [props.item.id]: event.target.value }))
        }
      />
      <PracticeFeedback evaluation={props.item.evaluation} />
      <div className="practice-actions">
        <span className="practice-save-state">
          {answerState.label}
        </span>
        <SaveAnswerButton
          itemId={props.item.id}
          itemBusy={answerState.itemBusy}
          disabled={answerState.saveDisabled}
          onSave={props.onSave}
        />
      </div>
    </article>
  );
}

type AnswerState = {
  draft: string;
  itemBusy: boolean;
  label: string;
  saveDisabled: boolean;
};

function getAnswerState(props: PracticeQuestionProps): AnswerState {
  const draft = props.drafts[props.item.id] ?? '';
  const saved = props.item.status !== 'pending';
  const hasUnsavedChanges = saved && draft.trim() !== (props.item.answer?.trim() ?? '');
  return {
    draft,
    itemBusy: props.busy === 'answer:' + props.item.id,
    label: saveStateLabel(saved, hasUnsavedChanges),
    saveDisabled: saveIsDisabled({
      isFinished: props.isFinished,
      busy: props.busy,
      draft,
      saved,
      hasUnsavedChanges,
    }),
  };
}

function saveStateLabel(saved: boolean, hasUnsavedChanges: boolean) {
  if (hasUnsavedChanges) return '有未保存的修改';
  return saved ? '已保存，已计入本轮复盘' : '待保存';
}

type SaveEligibility = {
  isFinished: boolean;
  busy: BusyAction;
  draft: string;
  saved: boolean;
  hasUnsavedChanges: boolean;
};

function saveIsDisabled(state: SaveEligibility) {
  return (
    state.isFinished ||
    state.busy !== null ||
    !state.draft.trim() ||
    (state.saved && !state.hasUnsavedChanges)
  );
}

function QuestionTags({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return (
    <div className="practice-question-tags" aria-label="题目能力标签">
      {tags.slice(0, VISIBLE_TAG_LIMIT).map((tag) => (
        <span key={tag}>{tag}</span>
      ))}
    </div>
  );
}

function PracticeFeedback({ evaluation }: { evaluation: PracticeSession['items'][number]['evaluation'] }) {
  if (!evaluation) return null;
  return (
    <aside className="practice-feedback" aria-label="本题即时反馈">
      <strong>即时建议</strong>
      <p>{evaluation.feedback}</p>
      {evaluation.missingPoints.length ? (
        <ul>
          {evaluation.missingPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      ) : null}
    </aside>
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
      {itemBusy ? '保存中…' : '保存回答'}
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
  const label = isFinished
    ? '本轮复盘已生成'
    : busy === 'submit'
      ? '正在生成复盘…'
      : '提交并生成本轮复盘';
  return (
    <button
      className="button practice-finish-button"
      type="button"
      disabled={!ready || isFinished || busy !== null}
      onClick={() => void onFinish()}
    >
      {label}
    </button>
  );
}
