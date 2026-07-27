'use client';

import type { InputHTMLAttributes } from 'react';

type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'type'> & {
  className?: string;
  clearLabel?: string;
  onClear?: () => void;
};

export function SearchInput({
  className,
  clearLabel = '清除搜索条件',
  onClear,
  value,
  ...inputProps
}: SearchInputProps) {
  const canClear = typeof value === 'string' && value.length > 0 && onClear;
  const rootClassName = ['search-input', className].filter(Boolean).join(' ');

  return (
    <div className={rootClassName}>
      <SearchGlyph />
      <input {...inputProps} className="search-input-control" type="search" value={value} />
      {canClear ? (
        <button
          aria-label={clearLabel}
          className="search-input-clear"
          type="button"
          onClick={onClear}
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
    </div>
  );
}

function SearchGlyph() {
  return (
    <svg aria-hidden="true" className="search-input-glyph" viewBox="0 0 24 24">
      <circle cx="10.8" cy="10.8" r="5.8" />
      <path d="m15.2 15.2 4 4" />
    </svg>
  );
}
