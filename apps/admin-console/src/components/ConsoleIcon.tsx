import type { ReactNode } from 'react';

export type ConsoleIconName =
  | 'overview'
  | 'analytics'
  | 'accounts'
  | 'import'
  | 'review'
  | 'workspace'
  | 'model'
  | 'activity'
  | 'audit'
  | 'refresh'
  | 'logout'
  | 'mail'
  | 'lock'
  | 'text'
  | 'document'
  | 'comment'
  | 'tag'
  | 'check'
  | 'list'
  | 'sparkle'
  | 'clock';

type ConsoleIconProps = {
  name: ConsoleIconName;
  className?: string;
  size?: number;
};

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const ICON_CONTENT: Record<ConsoleIconName, ReactNode> = {
  overview: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </>
  ),
  analytics: (
    <>
      <path d="M4 20V4M4 20h16" />
      <path d="m7 16 3.4-4 3 2 4.6-6" />
      <circle cx="7" cy="16" r="1" />
      <circle cx="10.4" cy="12" r="1" />
      <circle cx="13.4" cy="14" r="1" />
      <circle cx="18" cy="8" r="1" />
    </>
  ),
  accounts: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 9h5M18.5 6.5v5" />
    </>
  ),
  import: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5z" />
      <path d="M12 7v8M8.8 11.2 12 8l3.2 3.2M8 17h8" />
    </>
  ),
  review: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8.5 8h5M8.5 12h3M8.5 16h3M14.5 15.5l1.4 1.4 2.6-3" />
    </>
  ),
  workspace: (
    <>
      <path d="m12 3 8 4.4-8 4.4L4 7.4z" />
      <path d="m4 12.1 8 4.4 8-4.4M4 16.5l8 4.5 8-4.5" />
    </>
  ),
  model: (
    <>
      <path d="M4 7h16M4 17h16M8 3v8M16 13v8" />
      <circle cx="8" cy="7" r="2" />
      <circle cx="16" cy="17" r="2" />
    </>
  ),
  activity: <path d="M3 12h4l2.1-5 4 10 2.1-5H21" />,
  audit: (
    <>
      <path d="M9 4h6l1 2h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2z" />
      <path d="M8 11h8M8 15h8" />
    </>
  ),
  refresh: <path d="M20 11a8 8 0 1 0 1 4.2M20 5v6h-6" />,
  logout: (
    <>
      <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" />
      <path d="M14 8l4 4-4 4M18 12H8" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 1 1 8 0v3M12 14v2" />
    </>
  ),
  text: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </>
  ),
  document: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  comment: (
    <>
      <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
      <path d="M8 10h8M8 13h5" />
    </>
  ),
  tag: (
    <>
      <path d="M4 4h7l8 8-7 7-8-8z" />
      <circle cx="8.5" cy="8.5" r="1" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="m8.5 12 2.3 2.3 4.8-4.8" />
    </>
  ),
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  sparkle: (
    <>
      <path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z" />
      <path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v5l3 2" />
    </>
  ),
};

export function ConsoleIcon({ name, className, size = 20 }: ConsoleIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      height={size}
      viewBox="0 0 24 24"
      width={size}
      {...STROKE}
    >
      {ICON_CONTENT[name]}
    </svg>
  );
}
