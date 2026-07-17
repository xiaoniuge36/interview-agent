'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { isGlobalSearchShortcut, shouldOpenGlobalSearch } from './global-search-model';

type GlobalSearchContextValue = {
  open: (query?: string, trigger?: HTMLElement | null) => void;
  close: () => void;
  setQuery: (query: string) => void;
  query: string;
  isOpen: boolean;
};

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(null);

export function GlobalSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const restoringFocusRef = useRef(false);
  const restorePendingRef = useRef(false);

  const open = useCallback((nextQuery = '', trigger?: HTMLElement | null) => {
    if (!shouldOpenGlobalSearch(restoringFocusRef.current)) return;
    restorePendingRef.current = false;
    triggerRef.current = trigger ?? activeElement();
    setQuery(nextQuery);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    restorePendingRef.current = true;
    setIsOpen(false);
  }, []);

  useGlobalSearchShortcut(isOpen, open, close);
  useBodyScrollLock(isOpen);
  useEffect(() => {
    if (isOpen || !restorePendingRef.current) return;
    restorePendingRef.current = false;
    restoreTriggerFocus(triggerRef.current, restoringFocusRef);
  }, [isOpen]);

  return (
    <GlobalSearchContext.Provider value={{ open, close, setQuery, query, isOpen }}>
      {children}
    </GlobalSearchContext.Provider>
  );
}

export function useGlobalSearch() {
  const value = useContext(GlobalSearchContext);
  if (!value) throw new Error('useGlobalSearch must be used within GlobalSearchProvider');
  return value;
}

function useGlobalSearchShortcut(
  isOpen: boolean,
  open: GlobalSearchContextValue['open'],
  close: GlobalSearchContextValue['close'],
) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isGlobalSearchShortcut(event)) return;
      event.preventDefault();
      if (isOpen) close();
      else open('', activeElement());
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [close, isOpen, open]);
}

function useBodyScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);
}

function activeElement() {
  return document.activeElement instanceof HTMLElement ? document.activeElement : null;
}

function restoreTriggerFocus(
  trigger: HTMLElement | null,
  restoring: React.MutableRefObject<boolean>,
) {
  if (!trigger?.isConnected) return;
  restoring.current = true;
  try {
    trigger.focus();
  } finally {
    restoring.current = false;
  }
}
