import type { IconName } from './navigation';

type NavigationIconProps = {
  name: IconName;
};

const ICON_STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
};

export function NavigationIcon({ name }: NavigationIconProps) {
  if (name === 'grid') return <GridIcon />;
  if (name === 'user') return <UserIcon />;
  if (name === 'target') return <TargetIcon />;
  if (name === 'mic') return <MicIcon />;
  return <ChartIcon />;
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="1" {...ICON_STROKE} />
      <rect x="14" y="4" width="6" height="6" rx="1" {...ICON_STROKE} />
      <rect x="4" y="14" width="6" height="6" rx="1" {...ICON_STROKE} />
      <rect x="14" y="14" width="6" height="6" rx="1" {...ICON_STROKE} />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" {...ICON_STROKE} />
      <path d="M5 20c.8-3.3 3.2-5 7-5s6.2 1.7 7 5" {...ICON_STROKE} />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="7" {...ICON_STROKE} />
      <circle cx="12" cy="12" r="2.5" {...ICON_STROKE} />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" {...ICON_STROKE} />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="8" y="3" width="8" height="12" rx="4" {...ICON_STROKE} />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" {...ICON_STROKE} />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 19V5M4 19h16" {...ICON_STROKE} />
      <path d="m7 15 4-4 3 2 5-6" {...ICON_STROKE} />
    </svg>
  );
}
