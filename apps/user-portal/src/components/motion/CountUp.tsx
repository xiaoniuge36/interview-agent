'use client';

import React, { useEffect, useRef, useState } from 'react';

type CountUpProps = {
  value: number;
  durationMs?: number;
  delayMs?: number;
  className?: string;
  format?: (value: number) => string;
};

const CUBIC_EXPONENT = 3;

const easeOutCubic = (t: number) => 1 - (1 - t) ** CUBIC_EXPONENT;

function motionDisabled(): boolean {
  if (typeof document === 'undefined') return true;
  if (document.documentElement.dataset.motion === 'off') return true;
  if (typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * 数字滚动：挂载后从 0（更新时从上一个值）缓动到目标值。
 * SSR 与关闭动效时直接渲染最终值，屏幕阅读器始终读到目标值。
 */
export function CountUp({ value, durationMs = 760, delayMs = 0, className, format }: CountUpProps) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef<number | null>(null);

  useEffect(() => {
    if (motionDisabled()) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }
    const from = fromRef.current ?? 0;
    fromRef.current = value;
    if (from === value) {
      setDisplay(value);
      return;
    }
    let frame = 0;
    let start: number | null = null;
    const step = (now: number) => {
      if (start === null) start = now + delayMs;
      const elapsed = now - start;
      if (elapsed < 0) {
        setDisplay(from);
        frame = requestAnimationFrame(step);
        return;
      }
      const progress = Math.min(elapsed / durationMs, 1);
      setDisplay(from + (value - from) * easeOutCubic(progress));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs, delayMs]);

  const rounded = Math.round(display);
  const finalText = format ? format(value) : String(value);
  return (
    <span className={className}>
      <span aria-hidden="true">{format ? format(rounded) : rounded}</span>
      <span className="sr-only">{finalText}</span>
    </span>
  );
}
