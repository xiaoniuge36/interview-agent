import { describe, expect, it } from 'vitest';
import { accessScreenPresence } from './access-screen-presence';

describe('access screen presence', () => {
  it('keeps the branded transition during the initial auth check', () => {
    expect(accessScreenPresence(false, 'loading')).toBe(false);
  });

  it('keeps an already visible access form mounted while an auth action loads', () => {
    expect(accessScreenPresence(true, 'loading')).toBe(true);
  });

  it('shows the access form after an unauthenticated or failed check', () => {
    expect(accessScreenPresence(false, 'unauthenticated')).toBe(true);
    expect(accessScreenPresence(false, 'error')).toBe(true);
  });

  it('releases the access form after authentication succeeds', () => {
    expect(accessScreenPresence(true, 'authenticated')).toBe(false);
  });
});
