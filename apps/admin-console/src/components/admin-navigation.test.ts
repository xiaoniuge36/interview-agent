import { describe, expect, it } from 'vitest';
import {
  ADMIN_NAV_ITEMS,
  adminViewFromHash,
  adminViewHash,
  getAdminNavigationItem,
  isAdminView,
} from './admin-navigation';

describe('admin navigation', () => {
  it('maps each menu view to a stable deep-link hash', () => {
    for (const item of ADMIN_NAV_ITEMS) {
      expect(adminViewFromHash(adminViewHash(item.id))).toBe(item.id);
      expect(getAdminNavigationItem(item.id)).toBe(item);
    }
  });

  it('keeps existing section hashes working after the view split', () => {
    expect(adminViewFromHash('#section-0')).toBe('overview');
    expect(adminViewFromHash('#section-4')).toBe('models');
    expect(adminViewFromHash('#section-6')).toBe('audit');
  });

  it('falls back to overview for an unknown view', () => {
    expect(isAdminView('unknown')).toBe(false);
    expect(adminViewFromHash('#unknown')).toBe('overview');
  });
});
