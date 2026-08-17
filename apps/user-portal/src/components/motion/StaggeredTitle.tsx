'use client';

import { m, useReducedMotion } from 'motion/react';
import React from 'react';

type StaggeredTitleProps = {
  segments: readonly string[];
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'p';
  id?: string;
  className?: string;
};

const SEGMENT_STAGGER_SECONDS = 0.07;

export function StaggeredTitle({
  segments,
  as: Component = 'span',
  id,
  className = '',
}: StaggeredTitleProps) {
  const reduceMotion = useReducedMotion();
  const label = segments.join('');

  return (
    <Component id={id} className={`staggered-title ${className}`.trim()} aria-label={label}>
      {segments.map((segment, index) => (
        <m.span
          className="staggered-title-segment"
          aria-hidden="true"
          key={`${segment}-${index}`}
          initial={reduceMotion ? false : { opacity: 0, y: '0.7em', filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{
            delay: reduceMotion ? 0 : index * SEGMENT_STAGGER_SECONDS,
            duration: 0.56,
          }}
        >
          {segment}
        </m.span>
      ))}
    </Component>
  );
}
