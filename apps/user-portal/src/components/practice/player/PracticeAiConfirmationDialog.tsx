'use client';

import { type KeyboardEvent, useEffect, useRef } from 'react';
import { nextPracticeNavigationFocus } from './PracticeNavigationDialog';

type PracticeAiConfirmationDialogProps = {
  titleId: string;
  eyebrow: string;
  title: string;
  copy: string;
  benefits: string[];
  securityNote: string;
  cancelLabel: string;
  confirmLabel: string;
  glyph?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

type DialogKeyboardContext = {
  actions: Pick<PracticeAiConfirmationDialogProps, 'onCancel' | 'onConfirm'>;
  buttons: {
    cancel: HTMLButtonElement | null;
    confirm: HTMLButtonElement | null;
  };
};

export function PracticeAiConfirmationDialog(props: PracticeAiConfirmationDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  // 与 PracticeNavigationDialog 一致：打开时聚焦「取消」，关闭后归还触发前的焦点。
  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.requestAnimationFrame(() => cancelRef.current?.focus());
    return () => previousFocus?.focus();
  }, []);
  return (
    <div className="practice-ai-confirmation-backdrop">
      <section
        className="practice-item-ai-confirmation practice-ai-confirmation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={props.titleId}
        onKeyDown={(event) =>
          handleDialogKeydown(event, {
            actions: props,
            buttons: { cancel: cancelRef.current, confirm: confirmRef.current },
          })
        }
      >
        <ConfirmationCopy dialog={props} />
        <footer>
          <button ref={cancelRef} className="secondary" type="button" onClick={props.onCancel}>
            {props.cancelLabel}
          </button>
          <button ref={confirmRef} type="button" onClick={props.onConfirm}>
            {props.confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}

function ConfirmationCopy({ dialog }: { dialog: PracticeAiConfirmationDialogProps }) {
  return (
    <>
      <header>
        <span aria-hidden="true">{dialog.glyph ?? 'AI'}</span>
        <div>
          <small>{dialog.eyebrow}</small>
          <h2 id={dialog.titleId}>{dialog.title}</h2>
        </div>
      </header>
      <p>{dialog.copy}</p>
      <ul>
        {dialog.benefits.map((benefit) => (
          <li key={benefit}>{benefit}</li>
        ))}
      </ul>
      <div className="practice-ai-security-note">
        <span aria-hidden="true">✓</span>
        <p>{dialog.securityNote}</p>
      </div>
    </>
  );
}

function handleDialogKeydown(event: KeyboardEvent<HTMLElement>, context: DialogKeyboardContext) {
  const { cancel, confirm } = context.buttons;
  if (event.key === 'Escape') return context.actions.onCancel();
  if (event.key !== 'Tab' || !cancel || !confirm) return;
  event.preventDefault();
  const current = document.activeElement === confirm ? 'confirm' : 'cancel';
  const next = nextPracticeNavigationFocus(current);
  (next === 'confirm' ? confirm : cancel).focus();
}
