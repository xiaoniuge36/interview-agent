'use client';

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
} from 'react';
import { useRouter } from 'next/navigation';
import { moveSearchIndex, type GlobalSearchItem } from './global-search-model';
import { useGlobalSearch } from './GlobalSearchProvider';
import { GlobalSearchResults } from './GlobalSearchResults';
import { useGlobalSearchResults, type GlobalSearchResultsState } from './useGlobalSearchResults';

export function GlobalSearchDialog() {
  const search = useGlobalSearch();
  const results = useGlobalSearchResults(search.query);
  const controller = useSearchDialogController(results.items, search.close, search.isOpen);
  if (!search.isOpen) return null;
  return <SearchDialogSurface search={search} results={results} controller={controller} />;
}

function useSearchDialogController(items: GlobalSearchItem[], close: () => void, isOpen: boolean) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (isOpen) window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [isOpen]);
  useEffect(() => setActiveIndex(items.length ? 0 : -1), [items]);

  function navigate(item: GlobalSearchItem) {
    close();
    router.push(item.href);
  }
  function browseAll() {
    close();
    router.push('/questions');
  }
  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) =>
        moveSearchIndex(current, items.length, event.key === 'ArrowDown' ? 'next' : 'previous'),
      );
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      if (items[activeIndex]) navigate(items[activeIndex]);
    }
  }
  return { inputRef, dialogRef, activeIndex, setActiveIndex, navigate, browseAll, onInputKeyDown };
}

type SearchController = ReturnType<typeof useSearchDialogController>;
type SearchContext = ReturnType<typeof useGlobalSearch>;

function SearchDialogSurface({
  search,
  results,
  controller,
}: {
  search: SearchContext;
  results: GlobalSearchResultsState;
  controller: SearchController;
}) {
  function onBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) search.close();
  }
  function onDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      search.close();
    } else if (event.key === 'Tab') {
      keepFocusInDialog(event, controller.dialogRef);
    }
  }
  return (
    <div className="global-search-backdrop" role="presentation" onMouseDown={onBackdropMouseDown}>
      <section
        ref={controller.dialogRef}
        className="global-search-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-search-title"
        onKeyDown={onDialogKeyDown}
      >
        <h2 className="global-search-sr-title" id="global-search-title">
          全局搜索
        </h2>
        <SearchInput search={search} controller={controller} />
        <GlobalSearchResults
          {...results}
          query={search.query}
          activeIndex={controller.activeIndex}
          onActiveIndexChange={controller.setActiveIndex}
          onSelect={controller.navigate}
          onBrowseAll={controller.browseAll}
        />
      </section>
    </div>
  );
}

function SearchInput({
  search,
  controller,
}: {
  search: SearchContext;
  controller: SearchController;
}) {
  return (
    <div className="global-search-input-row">
      <SearchGlyph />
      <input
        ref={controller.inputRef}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded="true"
        aria-controls="global-search-results"
        aria-activedescendant={
          controller.activeIndex >= 0 ? `global-search-option-${controller.activeIndex}` : undefined
        }
        value={search.query}
        onChange={(event) => search.setQuery(event.target.value)}
        onKeyDown={controller.onInputKeyDown}
        placeholder="搜索题目、题库专题或功能页面…"
      />
      <button
        className="global-search-escape"
        type="button"
        onClick={search.close}
        aria-label="关闭搜索"
      >
        ESC
      </button>
    </div>
  );
}

function keepFocusInDialog(event: KeyboardEvent<HTMLElement>, dialogRef: RefObject<HTMLElement>) {
  const focusable = Array.from(
    dialogRef.current?.querySelectorAll<HTMLElement>('input, button, [href], [tabindex="0"]') ?? [],
  ).filter((element) => !element.hasAttribute('disabled'));
  if (!focusable.length) return;
  const current = focusable.indexOf(document.activeElement as HTMLElement);
  const movingPastStart = event.shiftKey && current <= 0;
  const movingPastEnd = !event.shiftKey && current === focusable.length - 1;
  if (!movingPastStart && !movingPastEnd) return;
  event.preventDefault();
  focusable[movingPastStart ? focusable.length - 1 : 0]?.focus();
}

function SearchGlyph() {
  return (
    <svg className="global-search-glyph" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 4.5 4.5" />
    </svg>
  );
}
