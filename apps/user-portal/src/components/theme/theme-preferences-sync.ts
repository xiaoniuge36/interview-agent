import {
  ThemePreferencesSchema,
  type ThemePreferences,
  type UserPreferencePayload,
} from '@interview-agent/contracts';

type InitialSyncSource = 'server' | 'local-upload' | 'local-fallback';

type InitialSyncResult = {
  preferences: ThemePreferences;
  source: InitialSyncSource;
};

type PreferenceReader = () => Promise<UserPreferencePayload>;
type PreferenceWriter = (preferences: ThemePreferences) => Promise<UserPreferencePayload>;
type PreferenceSaver = (preferences: ThemePreferences) => Promise<unknown>;

export async function synchronizeInitialPreferences(
  localPreferences: ThemePreferences,
  read: PreferenceReader,
  write: PreferenceWriter,
): Promise<InitialSyncResult> {
  const local = ThemePreferencesSchema.parse(localPreferences);
  try {
    const remote = preferenceFromPayload(await read());
    if (remote) return { preferences: remote, source: 'server' };
    try {
      const uploaded = preferenceFromPayload(await write(local));
      return uploaded
        ? { preferences: uploaded, source: 'local-upload' }
        : { preferences: local, source: 'local-fallback' };
    } catch {
      return { preferences: local, source: 'local-fallback' };
    }
  } catch {
    return { preferences: local, source: 'local-fallback' };
  }
}

export function createLatestThemePreferenceQueue(save: PreferenceSaver) {
  let generation = 0;
  let pending: ThemePreferences | null = null;
  let running: Promise<void> | null = null;

  function enqueue(preferences: ThemePreferences) {
    pending = ThemePreferencesSchema.parse(preferences);
    start();
  }

  function reset() {
    generation += 1;
    pending = null;
    running = null;
  }

  function idle() {
    return running ?? Promise.resolve();
  }

  function start() {
    if (running) return;
    const runGeneration = generation;
    const completion = drain(runGeneration).finally(() => {
      if (running === completion) running = null;
      if (generation === runGeneration && pending) start();
    });
    running = completion;
  }

  async function drain(runGeneration: number) {
    while (generation === runGeneration && pending) {
      const next = pending;
      pending = null;
      try {
        await save(next);
      } catch {
        if (generation !== runGeneration || !pending) return;
      }
    }
  }

  return { enqueue, reset, idle };
}

function preferenceFromPayload(payload: UserPreferencePayload): ThemePreferences | null {
  if (!payload.preferences) return null;
  return ThemePreferencesSchema.parse({
    theme: payload.preferences.theme,
    motion: payload.preferences.motion,
  });
}
