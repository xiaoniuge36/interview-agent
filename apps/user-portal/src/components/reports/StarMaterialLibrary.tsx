'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { StarMaterial } from '@interview-agent/contracts';
import { listStarMaterials } from '@/lib/practice-api';
import {
  DIMENSION_LABELS,
  orderedDimensionScores,
} from '@/components/practice/player/evaluation-dimensions';

const COPY_FEEDBACK_MS = 2000;
const TYPE_LABELS: Record<StarMaterial['questionType'], string> = {
  behavioral: '行为面试',
  project_deep_dive: '项目深挖',
};

type LibraryState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; materials: StarMaterial[] };

/** STAR 素材库：把行为/项目题的高分作答与 AI 高分示范沉淀为面试前可复用的素材。 */
export function StarMaterialLibrary({
  onTotalChange,
}: {
  onTotalChange?: (total: number) => void;
}) {
  const state = useStarMaterials(onTotalChange);
  if (state.status === 'loading') {
    return <LibraryState title="正在整理素材" copy="高分作答正在同步。" />;
  }
  if (state.status === 'error') {
    return <LibraryState title="素材库暂时无法读取" copy="已沉淀的素材不会丢失，请稍后重试。" />;
  }
  return <StarMaterialLibraryContent materials={state.materials} />;
}

export function StarMaterialLibraryContent({ materials }: { materials: StarMaterial[] }) {
  if (!materials.length) return <LibraryEmpty />;
  return (
    <section className="star-material-library motion-stagger" aria-label="STAR 素材库">
      <p className="star-material-hint">
        以下是你在行为面试 / 项目深挖题上拿到 70
        分以上的作答。面试前复习这些素材，或直接复用改写后的示范结构。
      </p>
      {materials.map((material) => (
        <StarMaterialCard key={material.id} material={material} />
      ))}
    </section>
  );
}

function useStarMaterials(onTotalChange?: (total: number) => void) {
  const [state, setState] = useState<LibraryState>({ status: 'loading' });
  // ref 化回调：父组件传内联函数时不应触发重新拉取。
  const onTotalChangeRef = useRef(onTotalChange);
  onTotalChangeRef.current = onTotalChange;
  useEffect(() => {
    let active = true;
    listStarMaterials()
      .then((materials) => {
        if (!active) return;
        setState({ status: 'ready', materials });
        onTotalChangeRef.current?.(materials.length);
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

function StarMaterialCard({ material }: { material: StarMaterial }) {
  return (
    <article className="star-material-card motion-lift">
      <header>
        <span className="star-material-type">{TYPE_LABELS[material.questionType]}</span>
        <h3>{material.questionTitle}</h3>
        <span className="star-material-score">
          <b>{Math.round(material.score)}</b>
          <small>评价得分</small>
        </span>
      </header>
      {material.tags.length ? (
        <div className="star-material-tags">
          {material.tags.map((tag) => (
            <i key={tag}>{tag}</i>
          ))}
        </div>
      ) : null}
      <DimensionChips material={material} />
      <details className="star-material-answer">
        <summary>我的作答</summary>
        <p>{material.answer}</p>
      </details>
      {material.improvedAnswer ? (
        <div className="star-material-improved">
          <strong>AI 高分示范</strong>
          <p>{material.improvedAnswer}</p>
        </div>
      ) : null}
      <footer>
        <CopyButton text={material.improvedAnswer ?? material.answer} />
        <time dateTime={material.evaluatedAt}>
          {new Date(material.evaluatedAt).toLocaleDateString('zh-CN')} 评价
        </time>
      </footer>
    </article>
  );
}

function DimensionChips({ material }: { material: StarMaterial }) {
  const scores = orderedDimensionScores(material.dimensionScores);
  if (!scores.length) return null;
  return (
    <div className="star-material-dimensions">
      {scores.map((item) => (
        <span key={item.dimension}>
          {DIMENSION_LABELS[item.dimension]}
          <b>{Math.round(item.score)}</b>
        </span>
      ))}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [feedback, setFeedback] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timerRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );
  function showFeedback(next: 'copied' | 'failed') {
    setFeedback(next);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setFeedback('idle'), COPY_FEEDBACK_MS);
  }
  function copy() {
    // 非安全上下文（HTTP）下 clipboard 不存在；权限被拒时 writeText 会 reject。
    if (!navigator.clipboard) {
      showFeedback('failed');
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => showFeedback('copied'),
      () => showFeedback('failed'),
    );
  }
  const label =
    feedback === 'copied' ? '已复制到剪贴板' : feedback === 'failed' ? '复制失败' : '复制素材';
  return (
    <button type="button" className="star-material-copy" onClick={copy}>
      {label}
    </button>
  );
}

function LibraryState({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="star-material-state">
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  );
}

function LibraryEmpty() {
  return (
    <div className="star-material-state">
      <strong>素材库还没有内容</strong>
      <p>完成「行为面试 / 项目深挖」类题目并拿到 70 分以上评价后，作答会自动沉淀到这里。</p>
      <Link className="button secondary" href="/questions?type=behavioral">
        去练行为面试题
      </Link>
    </div>
  );
}
