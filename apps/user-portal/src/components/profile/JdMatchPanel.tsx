'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { MasteryProfile } from '@interview-agent/contracts';
import { getMasteryProfiles } from '@/lib/practice-api';
import { matchJdWithMastery, type JdMatchItem } from './jd-match-model';

export type JdMasterySource =
  | { status: 'loading' }
  | { status: 'error'; reload: () => void }
  | { status: 'ready'; profiles: MasteryProfile[] };

/** 在 JD 分析卡内把用户的能力掌握度对照 JD 文本标注为「已覆盖 / 待补强」。 */
export function JdMatchPanel({ jdContext }: { jdContext: string }) {
  return <JdMatchPanelView jdContext={jdContext} mastery={useMasteryProfiles()} />;
}

/** 加载与失败也保持面板挂载：骨架/错误重试可见，避免整块静默消失。 */
export function JdMatchPanelView({
  jdContext,
  mastery,
}: {
  jdContext: string;
  mastery: JdMasterySource;
}) {
  return (
    <div className="jd-match" aria-label="JD 能力匹配标注" aria-busy={mastery.status === 'loading'}>
      <span className="jd-match-title">JD 匹配标注 · 基于你的训练掌握度</span>
      <JdMatchBody jdContext={jdContext} mastery={mastery} />
    </div>
  );
}

function JdMatchBody({ jdContext, mastery }: { jdContext: string; mastery: JdMasterySource }) {
  if (mastery.status === 'loading') return <JdMatchSkeleton />;
  if (mastery.status === 'error') return <JdMatchError onRetry={mastery.reload} />;
  const result = matchJdWithMastery(jdContext, mastery.profiles);
  if (!result.covered.length && !result.gaps.length) {
    return (
      <p className="jd-match-empty">
        完成几轮刷题后，Agent 会把你的能力掌握度对照这份 JD 标注出已覆盖与待补强项。
      </p>
    );
  }
  return (
    <>
      <JdMatchGroup
        label="已覆盖"
        tone="covered"
        items={result.covered}
        omitted={result.coveredOmitted}
      />
      <JdMatchGroup label="待补强" tone="gap" items={result.gaps} omitted={result.gapsOmitted} />
      {result.gaps.length ? (
        <Link className="jd-match-interview-cta" href="/interview">
          开始针对性模拟面试
        </Link>
      ) : null}
    </>
  );
}

function JdMatchSkeleton() {
  return (
    <div className="jd-match-skeleton" role="status" aria-label="正在读取掌握度">
      <i />
      <i />
      <i />
    </div>
  );
}

function JdMatchError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="jd-match-error" role="alert">
      <p>掌握度读取失败，暂时无法标注这份 JD。</p>
      <button type="button" onClick={onRetry}>
        重试
      </button>
    </div>
  );
}

function useMasteryProfiles(): JdMasterySource {
  const [state, setState] = useState<JdMasterySource>({ status: 'loading' });
  const [request, setRequest] = useState(0);
  useEffect(() => {
    let active = true;
    const reload = () => setRequest((value) => value + 1);
    setState({ status: 'loading' });
    getMasteryProfiles()
      .then((profiles) => {
        if (active) setState({ status: 'ready', profiles });
      })
      .catch(() => {
        if (active) setState({ status: 'error', reload });
      });
    return () => {
      active = false;
    };
  }, [request]);
  return state;
}

function JdMatchGroup({
  label,
  tone,
  items,
  omitted,
}: {
  label: string;
  tone: 'covered' | 'gap';
  items: JdMatchItem[];
  omitted: number;
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
      {omitted > 0 ? <small className="jd-match-omitted">还有 {omitted} 项未列出</small> : null}
    </div>
  );
}

function JdMatchChip({ item, tone }: { item: JdMatchItem; tone: 'covered' | 'gap' }) {
  const label = (
    <>
      {item.tag}
      <b>{item.score} 分</b>
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
