'use client';

import { type KeyboardEvent, useEffect, useRef } from 'react';
import type { confirmPracticeNavigation } from './practice-player-model';

type NavigationConfirmation = NonNullable<ReturnType<typeof confirmPracticeNavigation>>;

type PracticeNavigationDialogProps = {
  confirmation: NavigationConfirmation;
  onCancel: () => void;
  onConfirm: () => void;
};

type DialogKeyboardContext = {
  actions: Pick<PracticeNavigationDialogProps, 'onCancel' | 'onConfirm'>;
  buttons: {
    cancel: HTMLButtonElement | null;
    confirm: HTMLButtonElement | null;
  };
};

export function PracticeNavigationDialog(props: PracticeNavigationDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
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
        aria-labelledby="practice-navigation-dialog-title"
        aria-describedby="practice-navigation-dialog-description"
        onKeyDown={(event) =>
          handleDialogKeydown(event, {
            actions: props,
            buttons: { cancel: cancelRef.current, confirm: confirmRef.current },
          })
        }
      >
        <header>
          <span aria-hidden="true">稿</span>
          <div>
            <small>未保存草稿</small>
            <h2 id="practice-navigation-dialog-title">{props.confirmation.title}</h2>
          </div>
        </header>
        <p id="practice-navigation-dialog-description">{props.confirmation.description}</p>
        <footer>
          <button ref={cancelRef} className="secondary" type="button" onClick={props.onCancel}>
            {props.confirmation.cancelLabel}
          </button>
          <button ref={confirmRef} type="button" onClick={props.onConfirm}>
            {props.confirmation.confirmLabel}
          </button>
        </footer>
      </section>
    </div>
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

export function nextPracticeNavigationFocus(current: 'cancel' | 'confirm') {
  return current === 'cancel' ? 'confirm' : 'cancel';
}
