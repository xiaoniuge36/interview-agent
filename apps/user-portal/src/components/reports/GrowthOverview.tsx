'use client';

import type { MasteryProfile } from '@interview-agent/contracts';
import { useEffect, useState } from 'react';
import { getMasteryProfiles } from '@/lib/practice-api';
import {
  RADAR_SIZE,
  TREND_HEIGHT,
  TREND_WIDTH,
  buildRadarAxes,
  buildTrendPoints,
  radarPolygon,
  radarValuePolygon,
  selectRadarProfiles,
  trendPolyline,
  type RadarAxis,
  type TrendPoint,
} from './growth-overview-model';
import { formatTrainingRecordDate, type TrainingRecord } from './training-records-model';

const GRID_LEVEL_OUTER = 1;
const GRID_LEVEL_MIDDLE = 0.66;
const GRID_LEVEL_INNER = 0.33;
const GRID_LEVELS = [GRID_LEVEL_OUTER, GRID_LEVEL_MIDDLE, GRID_LEVEL_INNER];

/** 成长概览：左侧能力雷达（mastery 证据），右侧历次复盘得分趋势。 */
export function GrowthOverview({ records }: { records: TrainingRecord[] }) {
  const mastery = useMasteryProfiles();
  const axes = buildRadarAxes(mastery.profiles);
  const trend = buildTrendPoints(records);
  const fallbackProfiles = selectRadarProfiles(mastery.profiles);
  if (mastery.status === 'loading') return null;
  const masteryFailed = mastery.status === 'error';
  if (!axes.length && !fallbackProfiles.length && !trend.length && !masteryFailed) return null;
  if (masteryFailed && !trend.length) return null;
  return (
    <section className="growth-overview motion-rise" aria-label="成长概览">
      <article className="growth-overview-card">
        <header>
          <strong>能力雷达</strong>
          <span>来自练习与面试的证据加权</span>
        </header>
        <RadarSlot axes={axes} fallbackProfiles={fallbackProfiles} failed={masteryFailed} />
      </article>
      <article className="growth-overview-card">
        <header>
          <strong>得分趋势</strong>
          <span>最近 {trend.length || 0} 次已评分训练</span>
        </header>
        {trend.length ? <ScoreTrend points={trend} /> : <TrendEmpty />}
      </article>
    </section>
  );
}

function RadarSlot({
  axes,
  fallbackProfiles,
  failed,
}: {
  axes: RadarAxis[];
  fallbackProfiles: MasteryProfile[];
  failed: boolean;
}) {
  // 拉取失败与「训练还不够」是两回事，失败时不要用引导文案误导用户。
  if (failed) {
    return <p className="growth-overview-empty">掌握度暂时读取失败，稍后刷新即可恢复。</p>;
  }
  if (axes.length) return <CapabilityRadar axes={axes} />;
  return <MasteryFallback profiles={fallbackProfiles} />;
}

function useMasteryProfiles() {
  const [state, setState] = useState<{
    profiles: MasteryProfile[];
    status: 'loading' | 'ready' | 'error';
  }>({ profiles: [], status: 'loading' });
  useEffect(() => {
    let active = true;
    getMasteryProfiles()
      .then((profiles) => {
        if (active) setState({ profiles, status: 'ready' });
      })
      .catch(() => {
        if (active) setState({ profiles: [], status: 'error' });
      });
    return () => {
      active = false;
    };
  }, []);
  return state;
}

function CapabilityRadar({ axes }: { axes: RadarAxis[] }) {
  const summary = axes.map((axis) => `${axis.tag} ${axis.score} 分`).join('，');
  return (
    <figure className="growth-radar">
      <svg
        viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
        role="img"
        aria-label={`能力雷达图：${summary}`}
      >
        {GRID_LEVELS.map((level) => (
          <polygon key={level} className="growth-radar-grid" points={radarPolygon(axes, level)} />
        ))}
        {axes.map((axis) => (
          <line
            key={axis.tag}
            className="growth-radar-spoke"
            x1={RADAR_SIZE / 2}
            y1={RADAR_SIZE / 2}
            x2={axis.outer.x}
            y2={axis.outer.y}
          />
        ))}
        <polygon className="growth-radar-value" points={radarValuePolygon(axes)} />
        {axes.map((axis) => (
          <circle
            key={axis.tag}
            className="growth-radar-dot"
            cx={axis.point.x}
            cy={axis.point.y}
            r={3}
          />
        ))}
        {axes.map((axis) => (
          <RadarAxisLabel key={axis.tag} axis={axis} />
        ))}
      </svg>
    </figure>
  );
}

function RadarAxisLabel({ axis }: { axis: RadarAxis }) {
  return (
    <text className="growth-radar-label" x={axis.label.x} y={axis.label.y} textAnchor="middle">
      <tspan x={axis.label.x} dy="-0.2em">
        {axis.tag}
      </tspan>
      <tspan x={axis.label.x} dy="1.25em" className="growth-radar-score">
        {axis.score}
      </tspan>
    </text>
  );
}

/** 证据标签不足三个时雷达不可读，退化为横向能力条。 */
function MasteryFallback({ profiles }: { profiles: MasteryProfile[] }) {
  if (!profiles.length) {
    return (
      <p className="growth-overview-empty">
        完成三个以上能力标签的训练后，这里会生成你的能力雷达。
      </p>
    );
  }
  return (
    <ul className="growth-mastery-bars">
      {profiles.map((profile) => (
        <li key={profile.tag}>
          <span>{profile.tag}</span>
          <progress value={Math.round(profile.score)} max={100} />
          <b>{Math.round(profile.score)}</b>
        </li>
      ))}
    </ul>
  );
}

function ScoreTrend({ points }: { points: TrendPoint[] }) {
  const latest = points.at(-1)!;
  const best = points.reduce((max, point) => (point.score > max.score ? point : max), points[0]!);
  return (
    <figure className="growth-trend">
      <svg
        viewBox={`0 0 ${TREND_WIDTH} ${TREND_HEIGHT}`}
        role="img"
        aria-label={`得分趋势：最近 ${points.length} 次训练，最新 ${latest.score} 分，最高 ${best.score} 分`}
      >
        <polyline className="growth-trend-line" points={trendPolyline(points)} />
        {points.map((point) => (
          <circle
            key={`${point.date}-${point.x}`}
            className="growth-trend-dot"
            data-kind={point.kind}
            cx={point.x}
            cy={point.y}
            r={3.4}
          >
            <title>{`${formatTrainingRecordDate(point.date)} · ${point.title} · ${point.score} 分`}</title>
          </circle>
        ))}
      </svg>
      <figcaption>
        <span className="growth-trend-legend">
          <i data-kind="practice" /> 刷题
          <i data-kind="interview" /> 面试
        </span>
        <span>
          最新 <b>{latest.score}</b> · 最高 <b>{best.score}</b>
        </span>
      </figcaption>
    </figure>
  );
}

function TrendEmpty() {
  return (
    <p className="growth-overview-empty">完成两次以上带评分的训练后，这里会绘制你的成长曲线。</p>
  );
}
