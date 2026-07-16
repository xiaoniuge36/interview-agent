'use client';

import type { GlobalSearchItem, GlobalSearchKind } from './global-search-model';

type GlobalSearchResultsProps = {
  query: string;
  items: GlobalSearchItem[];
  activeIndex: number;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
  onActiveIndexChange: (index: number) => void;
  onSelect: (item: GlobalSearchItem) => void;
  onBrowseAll: () => void;
};

const GROUPS: { kind: GlobalSearchKind; label: string; emptyLabel?: string }[] = [
  { kind: 'question', label: '题目' },
  { kind: 'topic', label: '题库专题', emptyLabel: '推荐专题' },
  { kind: 'page', label: '功能页面', emptyLabel: '常用功能' },
];

export function GlobalSearchResults(props: GlobalSearchResultsProps) {
  const hasQuery = Boolean(props.query.trim());
  return (
    <>
      <div className="global-search-results" id="global-search-results" role="listbox">
        {props.isLoading ? <SearchLoading /> : null}
        {GROUPS.map((group) => (
          <ResultGroup key={group.kind} {...props} {...group} hasQuery={hasQuery} />
        ))}
        {!props.items.length && !props.isLoading ? (
          <SearchEmpty query={props.query} onBrowseAll={props.onBrowseAll} />
        ) : null}
        {props.error ? <SearchError message={props.error} retry={props.retry} /> : null}
      </div>
      <SearchFooter count={props.items.length} loading={props.isLoading} />
    </>
  );
}

function ResultGroup(
  props: GlobalSearchResultsProps & {
    kind: GlobalSearchKind;
    label: string;
    emptyLabel?: string;
    hasQuery: boolean;
  },
) {
  const indexedItems = props.items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.kind === props.kind);
  if (!indexedItems.length) return null;
  const label = !props.hasQuery && props.emptyLabel ? props.emptyLabel : props.label;
  return (
    <section
      className="global-search-group"
      role="group"
      aria-labelledby={`search-group-${props.kind}`}
    >
      <h3 id={`search-group-${props.kind}`}>{label}</h3>
      <div className="global-search-group-items">
        {indexedItems.map(({ item, index }) => (
          <SearchOption
            key={item.id}
            item={item}
            index={index}
            active={index === props.activeIndex}
            onActive={props.onActiveIndexChange}
            onSelect={props.onSelect}
          />
        ))}
      </div>
    </section>
  );
}

function SearchOption({
  item,
  index,
  active,
  onActive,
  onSelect,
}: {
  item: GlobalSearchItem;
  index: number;
  active: boolean;
  onActive: (index: number) => void;
  onSelect: (item: GlobalSearchItem) => void;
}) {
  return (
    <div
      id={`global-search-option-${index}`}
      className={active ? 'global-search-option active' : 'global-search-option'}
      role="option"
      aria-selected={active}
      onMouseEnter={() => onActive(index)}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onSelect(item)}
    >
      <span className={`global-search-option-glyph is-${item.kind}`} aria-hidden="true">
        {item.glyph}
      </span>
      <span className="global-search-option-copy">
        <span className="global-search-option-heading">
          <strong>{item.label}</strong>
          <small>{item.badge}</small>
        </span>
        <span className="global-search-option-description">{item.description}</span>
        {item.kind === 'question' && item.tags?.length ? (
          <span className="global-search-option-tags">
            {item.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </span>
        ) : null}
      </span>
      <span className="global-search-option-open" aria-hidden="true">
        ↵
      </span>
    </div>
  );
}

function SearchLoading() {
  return (
    <div className="global-search-loading" role="status">
      正在检索题目…
    </div>
  );
}

function SearchError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="global-search-error" role="status">
      <span>{message}</span>
      <button type="button" onClick={retry}>
        重试题目搜索
      </button>
    </div>
  );
}

function SearchEmpty({ query, onBrowseAll }: { query: string; onBrowseAll: () => void }) {
  return (
    <div className="global-search-empty">
      <span aria-hidden="true">⌕</span>
      <strong>没有找到“{query.trim()}”</strong>
      <p>换一个关键词，或进入完整题库使用更多筛选条件。</p>
      <button type="button" onClick={onBrowseAll}>
        进入完整题库
      </button>
    </div>
  );
}

function SearchFooter({ count, loading }: { count: number; loading: boolean }) {
  return (
    <footer className="global-search-footer">
      <span>
        <kbd>↑</kbd>
        <kbd>↓</kbd> 选择
      </span>
      <span>
        <kbd>Enter</kbd> 打开
      </span>
      <span>
        <kbd>Esc</kbd> 关闭
      </span>
      <strong>{loading ? '检索中' : `${count} 个结果`}</strong>
    </footer>
  );
}
