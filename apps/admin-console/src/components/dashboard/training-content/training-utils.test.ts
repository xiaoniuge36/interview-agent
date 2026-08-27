import { describe, expect, it } from 'vitest';
import { canPublishCandidate, mergeCompanyTags, splitCompanyTags } from './training-utils';

describe('canPublishCandidate', () => {
  it('only allows approved candidate questions to be published', () => {
    expect(canPublishCandidate('approved')).toBe(true);
    expect(canPublishCandidate('pending')).toBe(false);
    expect(canPublishCandidate('needs_edit')).toBe(false);
    expect(canPublishCandidate('rejected')).toBe(false);
  });
});

describe('mergeCompanyTags', () => {
  it('prefixes plain company names and keeps skill tags untouched', () => {
    expect(mergeCompanyTags(['缓存'], ['字节跳动'])).toEqual(['缓存', 'company:字节跳动']);
  });

  it('strips an accidental company: prefix instead of double-prefixing', () => {
    expect(mergeCompanyTags([], ['company:华为', ' 腾讯 ', ''])).toEqual([
      'company:华为',
      'company:腾讯',
    ]);
  });

  it('round-trips with splitCompanyTags', () => {
    const merged = mergeCompanyTags(['索引'], ['阿里']);
    expect(splitCompanyTags(merged)).toEqual({ plain: ['索引'], companies: ['阿里'] });
  });
});
