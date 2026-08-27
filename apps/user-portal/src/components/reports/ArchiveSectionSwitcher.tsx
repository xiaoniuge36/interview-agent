'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { isMistakeBookReturnHash } from '@/components/practice/player/practice-return-origin';

const SWITCHER_RISE_DELAY = { '--rise-delay': '90ms' } as CSSProperties;

export type ArchiveSection = 'records' | 'mistakes';
export type ArchiveSectionCounts = Partial<Record<ArchiveSection, number>>;

const SECTIONS: Array<{ id: ArchiveSection; label: string; hint: string }> = [
  { id: 'records', label: '训练记录', hint: '刷题与面试的全部复盘' },
  { id: 'mistakes', label: '错题本', hint: '低分题集中复练' },
];

/** 从错题复练返回的深链（/reports#mistake-book-heading）要直接落在错题本分区。 */
export function useArchiveSection() {
  const [section, setSection] = useState<ArchiveSection>('records');
  useEffect(() => {
    if (isMistakeBookReturnHash(window.location.hash)) setSection('mistakes');
  }, []);
  return { section, changeSection: setSection };
}

export function ArchiveSectionSwitcher({
  section,
  counts,
  onChange,
}: {
  section: ArchiveSection;
  counts: ArchiveSectionCounts;
  onChange: (section: ArchiveSection) => void;
}) {
  return (
    <div
      className="training-archive-sections motion-rise"
      style={SWITCHER_RISE_DELAY}
      role="group"
      aria-label="切换训练档案分区"
    >
      {SECTIONS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={section === item.id ? 'active' : ''}
          aria-pressed={section === item.id}
          onClick={() => onChange(item.id)}
        >
          <strong>
            {item.label}
            <SectionCount value={counts[item.id]} />
          </strong>
          <span>{item.hint}</span>
        </button>
      ))}
    </div>
  );
}

function SectionCount({ value }: { value: number | undefined }) {
  if (value === undefined) return null;
  return <i aria-hidden="true">{value}</i>;
}
