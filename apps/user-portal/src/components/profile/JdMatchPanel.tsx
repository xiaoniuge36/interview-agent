'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { MasteryProfile } from '@interview-agent/contracts';
import { getMasteryProfiles } from '@/lib/practice-api';
import { matchJdWithMastery, type JdMatchItem } from './jd-match-model';

type MasteryState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; profiles: MasteryProfile[] };

/** 在 JD 分析卡内把用户的能力掌握度对照 JD 文本标注为「已覆盖 / 待补强」。 */
export function JdMatchPanel({ jdContext }: { jdContext: string }) {
  const mastery = useMasteryProfiles();
  if (mastery.status === 'loading' || mastery.status === 'error') return null;
  const result = matchJdWithMastery(jdContext, mastery.profiles);
  return (
    <div className="jd-match" aria-label="JD 能力匹配标注">
      <span className="jd-match-title">JD 匹配标注 · 基于你的训练掌握度</span>
      {result.covered.length || result.gaps.length ? (
        <>
          <JdMatchGroup label="已覆盖" tone="covered" items={result.covered} />
          <JdMatchGroup label="待补强" tone="gap" items={result.gaps} />
        </>
      ) : (
        <p className="jd-match-empty">
          完成几轮刷题后，Agent 会把你的能力掌握度对照这份 JD 标注出已覆盖与待补强项。
        </p>
      )}
    </div>
  );
}

function useMasteryProfiles() {
  const [state, setState] = useState<MasteryState>({ status: 'loading' });
  useEffect(() => {
    let active = true;
    getMasteryProfiles()
      .then((profiles) => {
        if (active) setState({ status: 'ready', profiles });
      })
      .catch(() => {
        if (active) setState({ status: 'error' });
      });
    return () => {
      active = false;
    };
  }, []);
  return state;
}

function JdMatchGroup({
  label,
  tone,
  items,
}: {
  label: string;
  tone: 'covered' | 'gap';
  items: JdMatchItem[];
}) {
  if (!items.length) return null;
  return (
    <div className="jd-match-group" data-tone={tone}>
      <small>{label}</small>
      <div className="jd-match-chips">
        {items.map((item) => (
          <JdMatchChip key={item.tag} item={item} tone={tone} />
        ))}
      </div>
    </div>
  );
}

function JdMatchChip({ item, tone }: { item: JdMatchItem; tone: 'covered' | 'gap' }) {
  const label = (
    <>
      {item.tag}
      <b>{item.score}</b>
    </>
  );
  if (tone === 'gap') {
    return (
      <Link
        className="jd-match-chip"
        href={`/questions?tags=${encodeURIComponent(item.tag)}`}
        title={`去刷「${item.tag}」相关题目`}
      >
        {label}
      </Link>
    );
  }
  return <span className="jd-match-chip">{label}</span>;
}
