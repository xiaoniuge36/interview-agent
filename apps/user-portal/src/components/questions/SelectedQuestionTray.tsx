'use client';

import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { SelectedQuestion } from './question-selection-storage';

const MINUTES_PER_QUESTION = 4;
const MAX_QUESTIONS = 10;
const PERCENTAGE_TOTAL = 100;

type SelectedQuestionTrayProps = {
  selected: SelectedQuestion[];
  message: string;
  error: string;
  starting: boolean;
  onRemove: (id: string) => void;
  onClear: () => void;
  onQuickCompose: () => void;
  quickComposeDisabled: boolean;
  onStart: () => void;
};

export function SelectedQuestionTray(props: SelectedQuestionTrayProps) {
  const {
    selected,
    message,
    error,
    starting,
    onRemove,
    onClear,
    onQuickCompose,
    quickComposeDisabled,
    onStart,
  } = props;
  const [confirmingClear, setConfirmingClear] = useState(false);
  return (
    <aside className="selected-question-tray" aria-labelledby="selected-question-heading">
      <TrayAgentNote selectedCount={selected.length} />
      <SelectionHeader selectedCount={selected.length} onClear={() => setConfirmingClear(true)} />
      <div
        className="selected-question-progress"
        aria-label={`题单完成度 ${selected.length}/${MAX_QUESTIONS}`}
      >
        <span style={{ width: `${(selected.length / MAX_QUESTIONS) * PERCENTAGE_TOTAL}%` }} />
      </div>
      <SelectionList selected={selected} onRemove={onRemove} />
      <SelectionFeedback message={message} error={error} />
      <QuickCompose disabled={quickComposeDisabled} onQuickCompose={onQuickCompose} />
      <SelectionFooter selectedCount={selected.length} starting={starting} onStart={onStart} />
      {confirmingClear ? (
        <ClearSelectionDialog
          selectedCount={selected.length}
          onCancel={() => setConfirmingClear(false)}
          onConfirm={() => {
            setConfirmingClear(false);
            onClear();
          }}
        />
      ) : null}
    </aside>
  );
}

function TrayAgentNote({ selectedCount }: { selectedCount: number }) {
  return (
    <div className="selected-agent-note">
      <span aria-hidden="true">
        <SparkIcon />
      </span>
      <div>
        <strong>训练 Agent</strong>
        <p>
          {selectedCount
            ? `当前已选 ${selectedCount} 题，我会保留你的筛选和题单。`
            : '从知识解释到方案设计，建议控制在 3–5 题。'}
        </p>
        <small>档案和岗位只影响推荐，不限制自主刷题</small>
      </div>
    </div>
  );
}

function SelectionHeader({
  selectedCount,
  onClear,
}: {
  selectedCount: number;
  onClear: () => void;
}) {
  return (
    <header>
      <div>
        <span>本轮题单</span>
        <h2 id="selected-question-heading">
          已选{' '}
          <em key={selectedCount} className="selected-question-count motion-pop">
            {selectedCount}
          </em>{' '}
          / {MAX_QUESTIONS} 题
        </h2>
      </div>
      {selectedCount ? (
        <button type="button" onClick={onClear}>
          清空
        </button>
      ) : null}
    </header>
  );
}

function SelectionList({
  selected,
  onRemove,
}: {
  selected: SelectedQuestion[];
  onRemove: (id: string) => void;
}) {
  if (!selected.length)
    return (
      <div className="selected-question-list">
        <div className="selected-question-empty">
          <strong>还没有选择题目</strong>
          <p>从左侧加入 1–10 道题，题单会跨筛选和分页保留。</p>
        </div>
      </div>
    );
  return (
    <div className="selected-question-list">
      {selected.map((question, index) => (
        <div key={question.id}>
          <span>{index + 1}</span>
          <strong>{question.title}</strong>
          <button
            type="button"
            aria-label={`移除 ${question.title}`}
            onClick={() => onRemove(question.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function SelectionFeedback({ message, error }: { message: string; error: string }) {
  return (
    <>
      {message ? (
        <p className="selected-question-message" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="selected-question-error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}

function QuickCompose({
  disabled,
  onQuickCompose,
}: {
  disabled: boolean;
  onQuickCompose: () => void;
}) {
  return (
    <button
      className="selected-question-compose"
      type="button"
      disabled={disabled}
      onClick={onQuickCompose}
    >
      <SparkIcon />
      按当前筛选快速组卷
    </button>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5ZM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z" />
    </svg>
  );
}

/** 与练习内确认对话框一致：打开聚焦「取消」、Tab 双键循环、Escape 关闭、关闭归还焦点。 */
function useClearDialogFocusTrap(onCancel: () => void) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.requestAnimationFrame(() => cancelRef.current?.focus());
    return () => previousFocus?.focus();
  }, []);
  const trapKeydown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') return onCancel();
    if (event.key !== 'Tab' || !cancelRef.current || !confirmRef.current) return;
    event.preventDefault();
    (document.activeElement === confirmRef.current
      ? cancelRef.current
      : confirmRef.current
    ).focus();
  };
  return { cancelRef, confirmRef, trapKeydown };
}

/** 清空会一次丢掉最多 10 题的挑选且不可撤销：必须先确认。 */
export function ClearSelectionDialog({
  selectedCount,
  onCancel,
  onConfirm,
}: {
  selectedCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { cancelRef, confirmRef, trapKeydown } = useClearDialogFocusTrap(onCancel);
  return (
    <div className="practice-ai-confirmation-backdrop">
      <section
        className="practice-item-ai-confirmation practice-ai-confirmation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clear-selection-dialog-title"
        aria-describedby="clear-selection-dialog-description"
        onKeyDown={trapKeydown}
      >
        <header>
          <span aria-hidden="true">清</span>
          <div>
            <small>本轮题单</small>
            <h2 id="clear-selection-dialog-title">清空已选的 {selectedCount} 道题？</h2>
          </div>
        </header>
        <p id="clear-selection-dialog-description">
          清空后本轮题单需要重新挑选，此操作无法撤销；也可以在列表里逐题移除。
        </p>
        <footer>
          <button ref={cancelRef} className="secondary" type="button" onClick={onCancel}>
            保留题单
          </button>
          <button ref={confirmRef} type="button" onClick={onConfirm}>
            清空题单
          </button>
        </footer>
      </section>
    </div>
  );
}

function SelectionFooter({
  selectedCount,
  starting,
  onStart,
}: {
  selectedCount: number;
  starting: boolean;
  onStart: () => void;
}) {
  return (
    <footer>
      <span>预计 {selectedCount * MINUTES_PER_QUESTION} 分钟 · AI 评价可选</span>
      <button type="button" disabled={!selectedCount || starting} onClick={onStart}>
        {starting ? '正在创建…' : '开始本轮练习'}
      </button>
    </footer>
  );
}
