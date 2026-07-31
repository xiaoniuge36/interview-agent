'use client';

import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { ArchivedInterviewControl } from './archived-interview-control';

type InterviewStartControlProps = {
  control: ArchivedInterviewControl;
  onRetry: () => void;
  onStart: () => void;
};

export function InterviewStartControl(props: InterviewStartControlProps) {
  const [confirming, setConfirming] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const restart = props.control.action === 'restart';
  const activate = () => {
    if (props.control.action === 'retry') return props.onRetry();
    if (restart) return setConfirming(true);
    props.onStart();
  };
  return (
    <>
      <button
        ref={triggerRef}
        className={restart ? 'button secondary' : 'button'}
        type="button"
        disabled={props.control.disabled}
        aria-haspopup={restart ? 'dialog' : undefined}
        aria-expanded={restart ? confirming : undefined}
        onClick={activate}
      >
        {props.control.label}
      </button>
      {confirming ? (
        <InterviewRestartDialog
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            props.onStart();
          }}
        />
      ) : null}
    </>
  );
}

function InterviewRestartDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.requestAnimationFrame(() => cancelRef.current?.focus());
    return () => previousFocus?.focus();
  }, []);
  return (
    <div className="interview-restart-backdrop">
      <section
        className="interview-restart-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="interview-restart-title"
        aria-describedby="interview-restart-description"
        onKeyDown={(event) =>
          handleRestartKeydown(event, {
            onCancel,
            cancel: cancelRef.current,
            confirm: confirmRef.current,
          })
        }
      >
        <span>重新开始</span>
        <h2 id="interview-restart-title">重新开始一场面试？</h2>
        <p id="interview-restart-description">
          当前阶段和对话会保留在历史记录中；新一轮将从第一题开始，未提交草稿不会带入新会话。
        </p>
        <footer>
          <button ref={cancelRef} className="button secondary" type="button" onClick={onCancel}>
            保留本轮，继续回答
          </button>
          <button ref={confirmRef} className="button" type="button" onClick={onConfirm}>
            确认重新开始
          </button>
        </footer>
      </section>
    </div>
  );
}

type RestartKeyboardContext = {
  onCancel: () => void;
  cancel: HTMLButtonElement | null;
  confirm: HTMLButtonElement | null;
};

function handleRestartKeydown(event: KeyboardEvent<HTMLElement>, context: RestartKeyboardContext) {
  if (event.key === 'Escape') {
    event.preventDefault();
    context.onCancel();
    return;
  }
  if (event.key !== 'Tab' || !context.cancel || !context.confirm) return;
  event.preventDefault();
  const current = document.activeElement === context.confirm ? 'confirm' : 'cancel';
  const next = nextInterviewRestartFocus(current);
  (next === 'confirm' ? context.confirm : context.cancel).focus();
}

export function nextInterviewRestartFocus(current: 'cancel' | 'confirm') {
  return current === 'cancel' ? 'confirm' : 'cancel';
}
