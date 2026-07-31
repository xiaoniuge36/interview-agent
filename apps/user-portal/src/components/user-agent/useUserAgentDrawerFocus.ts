import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');
const COMPOSER_SELECTOR = 'textarea:not([disabled])';

type DrawerFocusOptions = {
  initialFocus: 'composer';
  onClose: () => void;
  open: boolean;
  trapFocus: boolean;
};

export function useUserAgentDrawerFocus(options: DrawerFocusOptions) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const { initialFocus, onClose, open, trapFocus } = options;
  useEffect(() => {
    if (!open) return;
    const previousFocus = activeElement();
    const dialog = dialogRef.current;
    focusInitialControl(dialog, initialFocus);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'Tab' && trapFocus) {
        keepFocusInside(event, dialog);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [initialFocus, onClose, open, trapFocus]);
  return dialogRef;
}

function focusInitialControl(dialog: HTMLElement | null, initialFocus: 'composer') {
  if (!dialog) return;
  const preferred =
    initialFocus === 'composer' ? dialog.querySelector<HTMLElement>(COMPOSER_SELECTOR) : null;
  preferred?.focus();
  if (dialog.contains(document.activeElement)) return;
  focusableElements(dialog)[0]?.focus();
  if (!dialog.contains(document.activeElement)) dialog.focus();
}

function keepFocusInside(event: KeyboardEvent, dialog: HTMLElement | null) {
  if (!dialog) return;
  const focusable = focusableElements(dialog);
  if (!focusable.length) {
    event.preventDefault();
    dialog.focus();
    return;
  }
  const active = activeElement();
  const first = focusable[0]!;
  const last = focusable.at(-1)!;
  if (!dialog.contains(active) || (event.shiftKey && active === first)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

function focusableElements(dialog: HTMLElement) {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      element.getClientRects().length > 0 && element.getAttribute('aria-hidden') !== 'true',
  );
}

function activeElement() {
  return document.activeElement instanceof HTMLElement ? document.activeElement : null;
}
