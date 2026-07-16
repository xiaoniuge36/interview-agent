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
import { isGlobalSearchShortcut } from './global-search-model';

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

  const open = useCallback((nextQuery = '', trigger?: HTMLElement | null) => {
    triggerRef.current = trigger ?? activeElement();
    setQuery(nextQuery);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useGlobalSearchShortcut(isOpen, open, close);
  useBodyScrollLock(isOpen);

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
