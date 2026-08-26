import { describe, expect, it } from 'vitest';
import { resolveDownloadFileName } from './download-file-name';
import { isInternalApiPath, normalizeBaseUrl } from './internal-path';

const FALLBACK = 'fallback.csv';

describe('resolveDownloadFileName', () => {
  it('prefers RFC 5987 encoded file names', () => {
    expect(
      resolveDownloadFileName("attachment; filename*=UTF-8''%E8%B4%A6%E5%8F%B7.csv", FALLBACK),
    ).toBe('账号.csv');
  });

  it('falls back to the plain filename parameter', () => {
    expect(resolveDownloadFileName('attachment; filename="report.csv"', FALLBACK)).toBe(
      'report.csv',
    );
  });

  it('rejects path traversal and control characters', () => {
    expect(resolveDownloadFileName('attachment; filename="../../etc/passwd"', FALLBACK)).toBe(
      FALLBACK,
    );
    expect(resolveDownloadFileName('attachment; filename="a\u0000b.csv"', FALLBACK)).toBe('ab.csv');
  });

  it('uses the fallback when the header is missing or empty', () => {
    expect(resolveDownloadFileName(null, FALLBACK)).toBe(FALLBACK);
    expect(resolveDownloadFileName('attachment; filename=""', FALLBACK)).toBe(FALLBACK);
  });
});

describe('internal path helpers', () => {
  it('normalizes trailing slashes from base urls', () => {
    expect(normalizeBaseUrl('https://api.example.test///')).toBe('https://api.example.test');
    expect(normalizeBaseUrl('  /gateway/ ')).toBe('/gateway');
  });

  it('accepts internal paths and rejects external ones', () => {
    expect(isInternalApiPath('/api/questions')).toBe(true);
    expect(isInternalApiPath('//evil.example/api')).toBe(false);
    expect(isInternalApiPath('https://evil.example/api')).toBe(false);
  });
});
