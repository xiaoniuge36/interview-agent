import { CONTRACT_LIMITS, type PracticeSession } from '@interview-agent/contracts';
import { selectedChoiceIds, toggleChoiceAnswer } from './practice-choice-answer';
import type { PlayerBusy } from './usePracticePlayer';

const MAX_VISIBLE_TAGS = 5;

type PracticeQuestionStageProps = {
  item: PracticeSession['items'][number];
  draft: string;
  busy: PlayerBusy;
  currentIndex: number;
  total: number;
  onDraft: (value: string) => void;
  onSave: () => void;
  onSaveAndNext: () => void;
  onSaveAndFeedback: () => void;
  onOpenFeedback: () => void;
  onPrevious: () => void;
  onNext: () => void;
};

export function PracticeQuestionStage(props: PracticeQuestionStageProps) {
  const savedAnswer = props.item.answer ?? '';
  const hasUnsavedChanges = props.draft.trim() !== savedAnswer.trim();
  const saving = props.busy === `save:${props.item.id}`;
  const closed = props.busy !== null && !saving;
  return (
    <article className="practice-question-stage" data-user-agent-scope="current-question">
      <StageHeader item={props.item} />
      <h1>{props.item.question.title}</h1>
      <p className="practice-question-stem">{props.item.question.stem}</p>
      <QuestionTags tags={props.item.question.tags} />
      <AnswerEditor
        {...props}
        closed={closed}
        hasUnsavedChanges={hasUnsavedChanges}
        saving={saving}
      />
      <StageFooter {...props} />
    </article>
  );
}

function StageHeader({ item }: { item: PracticeQuestionStageProps['item'] }) {
  return (
    <header>
      <div className="practice-stage-index">第 {String(item.sequence).padStart(2, '0')} 题</div>
      <div className="practice-stage-meta">
        <span>{typeLabel(item.question.type)}</span>
        <span>{difficultyLabel(item.question.difficulty)}</span>
      </div>
    </header>
  );
}

function QuestionTags({ tags }: { tags: string[] }) {
  return (
    <div className="practice-stage-tags">
      {tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
        <span key={tag}>{tag}</span>
      ))}
    </div>
  );
}

function AnswerEditor(
  props: PracticeQuestionStageProps & {
    closed: boolean;
    hasUnsavedChanges: boolean;
    saving: boolean;
  },
) {
  const choiceQuestion = isChoiceQuestion(props.item.question.type);
  return (
    <>
      {choiceQuestion ? <ChoiceAnswerEditor {...props} /> : <TextAnswerEditor {...props} />}
      <PracticeAnswerActions {...props} />
    </>
  );
}

function TextAnswerEditor(props: PracticeQuestionStageProps & { closed: boolean }) {
  return (
    <label className="practice-answer-editor">
      <span>
        <strong>我的回答</strong>
        <small>{props.draft.length.toLocaleString()} 字 · 建议包含背景、判断、行动与结果</small>
      </span>
      <textarea
        value={props.draft}
        maxLength={CONTRACT_LIMITS.longText}
        disabled={props.closed}
        placeholder="写下你的完整回答。保存后即可查看标准解析，也可以选择调用自己的 AI 模型获取评价。"
        onChange={(event) => props.onDraft(event.target.value)}
      />
    </label>
  );
}

function ChoiceAnswerEditor(props: PracticeQuestionStageProps & { closed: boolean }) {
  const options = props.item.question.options ?? [];
  const multiple = props.item.question.type === 'multiple_choice';
  const selected = selectedChoiceIds(props.draft, options);
  return (
    <fieldset className="practice-choice-editor" disabled={props.closed}>
      <legend>
        <strong>我的选择</strong>
        <small>{multiple ? '可选择多个答案' : '请选择一个答案'}</small>
      </legend>
      <div>
        {options.map((option) => (
          <label key={option.id} data-selected={selected.includes(option.id)}>
            <input
              type={multiple ? 'checkbox' : 'radio'}
              name={`practice-choice-${props.item.id}`}
              value={option.id}
              checked={selected.includes(option.id)}
              onChange={() =>
                props.onDraft(
                  toggleChoiceAnswer({
                    draft: props.draft,
                    optionId: option.id,
                    options,
                    multiple,
                  }),
                )
              }
            />
            <strong>{option.id}</strong>
            <span>{option.text}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function PracticeAnswerActions(
  props: PracticeQuestionStageProps & { hasUnsavedChanges: boolean; saving: boolean },
) {
  const saveDisabled = !props.draft.trim() || !props.hasUnsavedChanges || props.busy !== null;
  const primaryDisabled = props.busy !== null || (!props.draft.trim() && props.hasUnsavedChanges);
  return (
    <div className="practice-answer-actions">
      <span data-saved={!props.hasUnsavedChanges && Boolean(props.item.answer)}>
        {saveLabel(props.item.answer, props.hasUnsavedChanges)}
      </span>
      <div>
        <button
          className="practice-save-button"
          type="button"
          disabled={saveDisabled}
          onClick={props.onSave}
        >
          {props.saving ? '保存中…' : '仅保存'}
        </button>
        <PracticePrimaryAction {...props} disabled={primaryDisabled} />
      </div>
    </div>
  );
}

function PracticePrimaryAction(
  props: PracticeQuestionStageProps & {
    disabled: boolean;
    hasUnsavedChanges: boolean;
    saving: boolean;
  },
) {
  const action = primaryAnswerAction(props);
  return (
    <button
      className={action.className}
      type="button"
      disabled={props.disabled}
      onClick={action.onClick}
    >
      {props.saving ? '保存中…' : action.label}
    </button>
  );
}

function primaryAnswerAction(props: PracticeQuestionStageProps & { hasUnsavedChanges: boolean }) {
  const hasNext = props.currentIndex + 1 < props.total;
  if (hasNext && props.hasUnsavedChanges) {
    return primaryAction('保存并进入下一题 →', props.onSaveAndNext);
  }
  if (hasNext) return primaryAction('进入下一题 →', props.onNext);
  if (props.hasUnsavedChanges) {
    return primaryAction(
      '保存并进入 AI 评价 →',
      props.onSaveAndFeedback,
      'practice-save-next-button practice-save-feedback-button',
    );
  }
  return primaryAction(
    '进入 AI 评价 →',
    props.onOpenFeedback,
    'practice-save-next-button practice-save-feedback-button',
  );
}

function primaryAction(
  label: string,
  onClick: () => void,
  className = 'practice-save-next-button',
) {
  return { label, onClick, className };
}

function StageFooter(props: PracticeQuestionStageProps) {
  return (
    <footer>
      <button
        type="button"
        disabled={props.currentIndex === 0 || props.busy !== null}
        onClick={props.onPrevious}
      >
        ← 上一题
      </button>
      <span>
        {props.currentIndex + 1} / {props.total}
      </span>
    </footer>
  );
}

function saveLabel(answer: string | null, changed: boolean) {
  if (changed && answer) return '回答有未保存修改';
  if (answer) return '回答已保存到本轮练习';
  return '回答尚未保存';
}
function difficultyLabel(value: PracticeSession['items'][number]['question']['difficulty']) {
  return { intro: '入门', easy: '基础', medium: '进阶', hard: '高阶', expert: '专家' }[value];
}
function typeLabel(value: PracticeSession['items'][number]['question']['type']) {
  return {
    short_answer: '简答题',
    coding: '编程题',
    system_design: '系统设计',
    project_deep_dive: '项目深挖',
    behavioral: '行为面试',
    single_choice: '单选题',
    multiple_choice: '多选题',
  }[value];
}

function isChoiceQuestion(value: PracticeSession['items'][number]['question']['type']) {
  return value === 'single_choice' || value === 'multiple_choice';
}
