import { describe, expect, it } from 'vitest';
import { navigationLinkClass } from './navigation';

describe('sidebar navigation transition model', () => {
  it('moves the active visual state to the destination immediately after a click', () => {
    expect(navigationLinkClass('home', 'profile', 'profile')).toBe('active pending');
    expect(navigationLinkClass('home', 'profile', 'home')).toBe('');
    expect(navigationLinkClass('profile', null, 'profile')).toBe('active');
  });
});
