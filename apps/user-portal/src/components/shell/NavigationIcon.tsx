import type { IconName } from './navigation';

type NavigationIconProps = {
  name: IconName;
};

const ICON_STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function NavigationIcon({ name }: NavigationIconProps) {
  if (name === 'grid') return <GridIcon />;
  if (name === 'user') return <UserIcon />;
  if (name === 'target') return <TargetIcon />;
  if (name === 'book') return <BookIcon />;
  if (name === 'mic') return <MicIcon />;
  if (name === 'settings') return <SettingsIcon />;
  return <ChartIcon />;
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" {...ICON_STROKE} />
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

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5V5.5Z" {...ICON_STROKE} />
      <path d="M5 20.5A2.5 2.5 0 0 1 7.5 18H19" {...ICON_STROKE} />
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

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" {...ICON_STROKE} />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 2-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-2.8v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-2-2 .1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H5.6v-2.8h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L7 8.2l2-2 .1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h2.8V5a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 2 2-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2V14H21a1.7 1.7 0 0 0-1.6 1Z" {...ICON_STROKE} />
    </svg>
  );
}
