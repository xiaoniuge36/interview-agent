import { describe, expect, it } from 'vitest';
import {
  parseSettingsReturnTarget,
  settingsHrefForInterview,
  settingsHrefForPractice,
  settingsReturnTargetFromSearch,
} from './settings-return-target';

describe('settings return target', () => {
  it('accepts only a canonical practice session target', () => {
    expect(parseSettingsReturnTarget('/practice?session=session-123')).toEqual({
      href: '/practice?session=session-123',
      kind: 'practice',
    });
    expect(settingsReturnTargetFromSearch('?returnTo=%2Fpractice%3Fsession%3Dsession-123')).toEqual(
      { href: '/practice?session=session-123', kind: 'practice' },
    );
    expect(settingsHrefForPractice('session-123')).toBe(
      '/settings?returnTo=%2Fpractice%3Fsession%3Dsession-123',
    );
  });

  it('accepts only a canonical interview session target', () => {
    expect(parseSettingsReturnTarget('/interview?session=interview-123')).toEqual({
      href: '/interview?session=interview-123',
      kind: 'interview',
    });
    expect(
      settingsReturnTargetFromSearch('?returnTo=%2Finterview%3Fsession%3Dinterview-123'),
    ).toEqual({ href: '/interview?session=interview-123', kind: 'interview' });
    expect(settingsHrefForInterview('interview-123')).toBe(
      '/settings?returnTo=%2Finterview%3Fsession%3Dinterview-123',
    );
  });
});

describe('settings return target safety', () => {
  it.each([
    null,
    '',
    '//evil.example/practice?session=session-123',
    'https://evil.example/practice?session=session-123',
    '\\practice?session=session-123',
    '%2Fpractice%3Fsession%3Dsession-123',
    '/practice?session=%252Fadmin',
    '/practice?session=session-123#fragment',
    '/practice?session=session-123&next=/admin',
    '/practice?session=',
    '/questions?session=session-123',
    `/practice?session=${'a'.repeat(129)}`,
    '//evil.example/interview?session=session-123',
    'https://evil.example/interview?session=session-123',
    '\\interview?session=session-123',
    '%2Finterview%3Fsession%3Dsession-123',
    '/interview?session=%252Fadmin',
    '/interview?session=session-123#fragment',
    '/interview?session=session-123&next=/admin',
    '/interview?session=',
    `/interview?session=${'a'.repeat(129)}`,
  ])('rejects unsafe or non-allowed target %s', (target) => {
    expect(parseSettingsReturnTarget(target)).toBeNull();
  });

  it('rejects duplicate returnTo parameters and invalid builder input', () => {
    expect(
      settingsReturnTargetFromSearch(
        '?returnTo=%2Fpractice%3Fsession%3Done&returnTo=%2Fpractice%3Fsession%3Dtwo',
      ),
    ).toBeNull();
    expect(settingsHrefForPractice('../admin')).toBe('/settings');
    expect(settingsHrefForInterview('../admin')).toBe('/settings');
  });
});
