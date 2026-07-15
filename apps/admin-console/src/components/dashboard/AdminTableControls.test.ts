import { describe, expect, it } from 'vitest';
import { getAntdPageSize } from './admin-pagination';

describe('getAntdPageSize', () => {
  it('maps pre-sliced records to the same number of AntD pagination pages', () => {
    expect(getAntdPageSize(24, 3)).toBe(8);
    expect(getAntdPageSize(18, 1)).toBe(18);
    expect(getAntdPageSize(0, 1)).toBe(1);
  });
});
