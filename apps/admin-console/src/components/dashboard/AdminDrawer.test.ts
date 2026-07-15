import { describe, expect, it } from 'vitest';
import { isDrawerCloseKey } from './AdminDrawer';

describe('AdminDrawer keyboard behavior', () => {
  it('closes only for the Escape key', () => {
    expect(isDrawerCloseKey('Escape')).toBe(true);
    expect(isDrawerCloseKey('Enter')).toBe(false);
  });
});
