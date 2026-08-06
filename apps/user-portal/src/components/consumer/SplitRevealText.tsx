import type { CSSProperties } from 'react';

type SplitRevealTextProps = {
  text: string;
  className?: string;
};

const REVEAL_STAGGER_MS = 18;

export function SplitRevealText({ text, className = '' }: SplitRevealTextProps) {
  return (
    <span className={`consumer-split-reveal ${className}`.trim()} aria-label={text}>
      {Array.from(text).map((character, index) => (
        <span
          className="consumer-reveal-character"
          aria-hidden="true"
          key={`${character}-${index}`}
          style={{ '--reveal-delay': `${index * REVEAL_STAGGER_MS}ms` } as CSSProperties}
        >
          {character}
        </span>
      ))}
    </span>
  );
}
