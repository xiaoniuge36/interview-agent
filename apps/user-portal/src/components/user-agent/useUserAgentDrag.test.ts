import { describe, expect, it, vi } from 'vitest';
import * as userAgentDrag from './useUserAgentDrag';
import { persistUserAgentPositionSafely } from './useUserAgentDrag';

const POSITION = { right: 32, bottom: 96 };

describe('user agent drag position persistence', () => {
  it('starts in the desktop right-edge safety rail', () => {
    expect(userAgentDrag).toHaveProperty('defaultUserAgentFloatPosition');
    const defaultPosition = (
      userAgentDrag as typeof userAgentDrag & {
        defaultUserAgentFloatPosition: () => { right: number; bottom: number };
      }
    ).defaultUserAgentFloatPosition;

    expect(defaultPosition()).toEqual({ right: 16, bottom: 92 });
  });

  it('stores a valid desktop position', () => {
    const setItem = vi.fn();

    expect(persistUserAgentPositionSafely(POSITION, () => ({ setItem }))).toBe(true);
    expect(setItem).toHaveBeenCalledWith(
      'user-portal.page-agent.position',
      JSON.stringify(POSITION),
    );
  });

  it('does not throw when local storage access is blocked', () => {
    const getStorage = () => {
      throw new Error('blocked');
    };

    expect(persistUserAgentPositionSafely(POSITION, getStorage)).toBe(false);
  });

  it('does not throw when writing the position fails', () => {
    const setItem = () => {
      throw new Error('quota exceeded');
    };

    expect(persistUserAgentPositionSafely(POSITION, () => ({ setItem }))).toBe(false);
  });
});
