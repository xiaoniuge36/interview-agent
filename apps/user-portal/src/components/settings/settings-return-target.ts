const MAX_SESSION_ID_LENGTH = 128;
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export type SettingsReturnTarget =
  | { kind: 'practice'; href: `/practice?session=${string}` }
  | { kind: 'interview'; href: `/interview?session=${string}` };

export function parseSettingsReturnTarget(value: string | null): SettingsReturnTarget | null {
  if (!validTargetShape(value)) return null;
  const parsed = new URL(value, 'https://settings-return.invalid');
  return targetFromUrl(parsed);
}

function validTargetShape(value: string | null): value is string {
  return Boolean(
    value &&
    !value.includes('%') &&
    !value.includes('\\') &&
    !value.includes('#') &&
    (value.startsWith('/practice?') || value.startsWith('/interview?')) &&
    !value.startsWith('//'),
  );
}

function targetFromUrl(parsed: URL): SettingsReturnTarget | null {
  const parameters = [...parsed.searchParams.keys()];
  const sessions = parsed.searchParams.getAll('session');
  const kind = targetKind(parsed.pathname);
  if (!kind || parameters.length !== 1 || sessions.length !== 1) return null;
  const sessionId = sessions[0] ?? '';
  if (!validSessionId(sessionId)) return null;
  if (kind === 'practice') return { kind, href: `/practice?session=${sessionId}` };
  return { kind, href: `/interview?session=${sessionId}` };
}

function targetKind(pathname: string) {
  if (pathname === '/practice') return 'practice' as const;
  if (pathname === '/interview') return 'interview' as const;
  return null;
}

export function settingsReturnTargetFromSearch(search: string): SettingsReturnTarget | null {
  const values = new URLSearchParams(search).getAll('returnTo');
  return values.length === 1 ? parseSettingsReturnTarget(values[0] ?? null) : null;
}

export function settingsHrefForPractice(sessionId: string) {
  return settingsHrefForSession('practice', sessionId);
}

export function settingsHrefForInterview(sessionId: string) {
  return settingsHrefForSession('interview', sessionId);
}

function settingsHrefForSession(kind: SettingsReturnTarget['kind'], sessionId: string) {
  if (!validSessionId(sessionId)) return '/settings' as const;
  const target = `/${kind}?session=${sessionId}`;
  return `/settings?returnTo=${encodeURIComponent(target)}` as const;
}

function validSessionId(sessionId: string) {
  return (
    sessionId.length > 0 &&
    sessionId.length <= MAX_SESSION_ID_LENGTH &&
    SESSION_ID_PATTERN.test(sessionId)
  );
}
