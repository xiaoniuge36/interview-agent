import { CONTRACT_LIMITS, type PracticeSession } from '@interview-agent/contracts';
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
      <StageFooter {...props} hasUnsavedChanges={hasUnsavedChanges} />
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
  const saveDisabled = !props.draft.trim() || !props.hasUnsavedChanges || props.busy !== null;
  return (
    <>
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
      <div className="practice-save-row">
        <span data-saved={!props.hasUnsavedChanges && Boolean(props.item.answer)}>
          {saveLabel(props.item.answer, props.hasUnsavedChanges)}
        </span>
        <button type="button" disabled={saveDisabled} onClick={props.onSave}>
          {props.saving ? '保存中…' : props.item.answer ? '保存修改' : '保存回答'}
        </button>
      </div>
    </>
  );
}

function StageFooter(props: PracticeQuestionStageProps & { hasUnsavedChanges: boolean }) {
  const hasNext = props.currentIndex + 1 < props.total;
  const next = props.hasUnsavedChanges ? props.onSaveAndNext : props.onNext;
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
      <button type="button" disabled={!hasNext || props.busy !== null} onClick={next}>
        {props.hasUnsavedChanges ? '保存并下一题 →' : '下一题 →'}
      </button>
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
  }[value];
}
